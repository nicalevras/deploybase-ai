import { createHash } from "crypto";
import { stableToolKey } from "@/features/data-explorer/stable-keys";
import type {
  ToolInfiniteQueryResponse,
  ToolLogsMeta,
} from "@/features/data-explorer/tools/tools-query-options";
import type { ToolColumnSchema } from "@/features/data-explorer/tools/tools-schema";
import {
  toolsSearchParamsCache,
  type ToolsSearchParamsType,
} from "@/features/data-explorer/tools/tools-search-params";
import { auth } from "@/lib/auth";
import { STANDARD_CACHE_TTL } from "@/lib/cache/constants";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http-cache";
import { logger } from "@/lib/logger";
import { toolsCache } from "@/lib/tools-cache";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CACHE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024; // 2MB

const getCachedFacets = unstable_cache(
  async () => {
    return await toolsCache.getToolFacets();
  },
  ["tools:facets"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["tools"],
  },
);

const hashObject = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function buildToolFavoritesCacheKey(
  userId: string,
  search: ToolsSearchParamsType,
) {
  const sortedEntries = Object.entries(search ?? {})
    .map(([key, value]) => [key, value] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return ["tool-favorites:filtered", userId, hashObject(sortedEntries)];
}

async function getCachedFavoriteToolsFiltered(
  userId: string,
  search: ToolsSearchParamsType,
) {
  const cacheFn = unstable_cache(
    async () => {
      const result = await toolsCache.getFavoriteToolsFiltered(userId, search);
      const estimatedSize = JSON.stringify(result).length;
      if (estimatedSize > CACHE_SIZE_LIMIT_BYTES) {
        throw new Error(
          `Cache size (${estimatedSize} bytes) exceeds limit (${CACHE_SIZE_LIMIT_BYTES} bytes)`,
        );
      }
      return result;
    },
    buildToolFavoritesCacheKey(userId, search),
    {
      revalidate: STANDARD_CACHE_TTL,
      tags: ["tool-favorites"],
    },
  );
  return cacheFn();
}

async function getFavoriteRowsDirect(
  userId: string,
  search: ToolsSearchParamsType,
): Promise<ToolInfiniteQueryResponse<ToolColumnSchema[], ToolLogsMeta>> {
  let filteredTools;
  let totalCount: number;
  let filterCount: number;

  try {
    const result = await getCachedFavoriteToolsFiltered(userId, search);
    filteredTools = result.data;
    totalCount = result.totalCount;
    filterCount = result.filterCount;
  } catch {
    const result = await toolsCache.getFavoriteToolsFiltered(userId, search);
    filteredTools = result.data;
    totalCount = result.totalCount;
    filterCount = result.filterCount;
  }

  const facets = await getCachedFacets();

  if (filteredTools.length === 0) {
    return {
      data: [],
      meta: {
        totalRowCount: totalCount,
        filterRowCount: filterCount,
        facets,
      },
      prevCursor: null,
      nextCursor: null,
    };
  }

  const start =
    typeof search.cursor === "number" && search.cursor >= 0 ? search.cursor : 0;
  const pageSize = Math.min(Math.max(1, search.size ?? 50), 200);
  return {
    data: filteredTools.map((tool) => ({
      id: String(tool.id),
      name: tool.name,
      developer: tool.developer,
      description: tool.description,
      category: tool.category,
      price: tool.price,
      license: tool.license,
      url: tool.url,
      stack: tool.stack,
      oss: tool.oss,
      stable_key: tool.stableKey || stableToolKey(tool),
    })),
    meta: {
      totalRowCount: totalCount,
      filterRowCount: filterCount,
      facets,
    },
    prevCursor: start > 0 ? Math.max(0, start - pageSize) : null,
    nextCursor:
      start + filteredTools.length < filterCount
        ? start + filteredTools.length
        : null,
  };
}

const RequestSchema = z.object({
  keys: z.array(z.string().min(1)).max(200),
});

export async function GET(req: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = toolsSearchParamsCache.parse(Object.fromEntries(_search));

    const cursor = search.cursor ?? null;
    const size = Math.min(Math.max(1, search.size ?? 50), 200);
    const normalizedSearch: ToolsSearchParamsType = { ...search, cursor, size };

    const result = await getFavoriteRowsDirect(
      session.user.id,
      normalizedSearch,
    );
    return NextResponse.json(result, {
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
      },
    });
  } catch (error) {
    logger.error(
      "[GET /api/tools/favorites/rows] Failed to fetch favorite rows",
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const rows = await toolsCache.getToolsByStableKeys(parsed.data.keys);
    return NextResponse.json({
      rows: rows.map((tool) => ({
        id: String(tool.id),
        name: tool.name,
        developer: tool.developer,
        description: tool.description,
        category: tool.category,
        price: tool.price,
        license: tool.license,
        url: tool.url,
        stack: tool.stack,
        oss: tool.oss,
        stable_key: tool.stableKey || stableToolKey(tool),
      })),
    });
  } catch (error) {
    logger.error("[POST /api/tools/favorites/rows] Failed to resolve rows", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
