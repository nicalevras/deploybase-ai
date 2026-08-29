import { createHash } from "crypto";
import type {
  InfiniteQueryResponse,
  LogsMeta,
} from "@/features/data-explorer/table/query-options";
import type {
  ColumnSchema,
  FacetMetadataSchema,
} from "@/features/data-explorer/table/schema";
import { searchParamsCache } from "@/features/data-explorer/table/search-params";
import type { SearchParamsType } from "@/features/data-explorer/table/search-params";
import { auth } from "@/lib/auth";
import { STANDARD_CACHE_TTL } from "@/lib/cache/constants";
import { mapGpuRowToColumnSchema } from "@/lib/gpu-column-transformer";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http-cache";
import { logger } from "@/lib/logger";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CACHE_SIZE_LIMIT_BYTES = 2 * 1024 * 1024; // 2MB

const PROVIDER_SORT_PRIORITY: Record<string, number> = {
  coreweave: 1,
  lambda: 2,
  runpod: 3,
  digitalocean: 4,
  oracle: 5,
  nebius: 6,
  hyperstack: 7,
  crusoe: 8,
};

function sortProviderFacet(facets?: Record<string, FacetMetadataSchema>) {
  if (!facets?.provider?.rows?.length) return;

  facets.provider.rows.sort((a, b) => {
    const aKey = String(a.value).toLowerCase();
    const bKey = String(b.value).toLowerCase();
    const aPriority = PROVIDER_SORT_PRIORITY[aKey] ?? Number.MAX_SAFE_INTEGER;
    const bPriority = PROVIDER_SORT_PRIORITY[bKey] ?? Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return aKey.localeCompare(bKey);
  });
}

function sortModelFacet(facets?: Record<string, FacetMetadataSchema>) {
  if (!facets?.gpu_model?.rows?.length) return;

  facets.gpu_model.rows.sort((a, b) =>
    String(a.value).localeCompare(String(b.value), undefined, {
      sensitivity: "base",
    }),
  );
}

const getCachedFacets = unstable_cache(
  async () => {
    return await gpuPricingCache.getGpusFacets();
  },
  ["pricing:facets"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["pricing"],
  },
);

const hashObject = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function buildFavoritesCacheKey(userId: string, search: SearchParamsType) {
  const sortedEntries = Object.entries(search ?? {})
    .map(([key, value]) => [key, value] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return ["favorites:filtered", userId, hashObject(sortedEntries)];
}

async function getCachedFavoriteGpusFiltered(
  userId: string,
  search: SearchParamsType,
) {
  const cacheFn = unstable_cache(
    async () => {
      const result = await gpuPricingCache.getFavoriteGpusFiltered(
        userId,
        search,
      );

      const estimatedSize = JSON.stringify(result).length;

      if (estimatedSize > CACHE_SIZE_LIMIT_BYTES) {
        logger.warn(
          "[getCachedFavoriteGpusFiltered] Cache size limit exceeded, will fall back to direct DB query",
          {
            userId,
            estimatedSizeBytes: estimatedSize,
            limitBytes: CACHE_SIZE_LIMIT_BYTES,
            rowCount: result.data.length,
            searchParams: {
              cursor: search.cursor,
              size: search.size,
              sort: search.sort,
            },
          },
        );

        throw new Error(
          `Cache size (${estimatedSize} bytes) exceeds limit (${CACHE_SIZE_LIMIT_BYTES} bytes)`,
        );
      }

      return result;
    },
    buildFavoritesCacheKey(userId, search),
    {
      revalidate: STANDARD_CACHE_TTL,
      tags: ["favorites"],
    },
  );

  return cacheFn();
}

// Get favorite rows with database-level sorting and pagination (TanStack Table best practice)
async function getFavoriteRowsDirect(
  userId: string,
  search: SearchParamsType,
): Promise<InfiniteQueryResponse<ColumnSchema[], LogsMeta>> {
  // Use cached query to reduce DB load
  // If cache fails (e.g., > 2MB), falls back to DB query gracefully
  let filteredGpus: Awaited<
    ReturnType<typeof gpuPricingCache.getFavoriteGpusFiltered>
  >["data"];
  let totalCount: number;
  let filterCount: number;

  try {
    const result = await getCachedFavoriteGpusFiltered(userId, search);
    filteredGpus = result.data;
    totalCount = result.totalCount;
    filterCount = result.filterCount;
  } catch (error) {
    // Fallback to direct DB query if cache fails (e.g., > 2MB or cache error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isSizeError =
      errorMessage.includes("2MB") ||
      errorMessage.includes("size") ||
      errorMessage.includes("cache");

    if (isSizeError) {
      logger.warn(
        "[getFavoriteRowsDirect] Cache size limit exceeded, using direct DB query",
        {
          userId,
          searchParams: {
            cursor: search.cursor,
            size: search.size,
            sort: search.sort,
          },
          error: errorMessage,
        },
      );
    } else {
      logger.warn(
        "[getFavoriteRowsDirect] Cache lookup failed, falling back to DB",
        {
          userId,
          searchParams: {
            cursor: search.cursor,
            size: search.size,
            sort: search.sort,
          },
          error: errorMessage,
        },
      );
    }

    // Fallback to direct DB query
    const result = await gpuPricingCache.getFavoriteGpusFiltered(
      userId,
      search,
    );
    filteredGpus = result.data;
    totalCount = result.totalCount;
    filterCount = result.filterCount;
  }

  const facetsData = await getCachedFacets();
  const facets = {
    provider: facetsData.provider,
    type: facetsData.type,
    gpu_model: facetsData.gpu_model,
    vram_gb: facetsData.vram_gb,
    price_hour_usd: facetsData.price_hour_usd,
  };

  sortProviderFacet(facets);
  sortModelFacet(facets);

  if (filteredGpus.length === 0) {
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
    data: filteredGpus.map(mapGpuRowToColumnSchema),
    meta: {
      totalRowCount: totalCount,
      filterRowCount: filterCount,
      facets,
    },
    prevCursor: start > 0 ? Math.max(0, start - pageSize) : null,
    nextCursor:
      start + filteredGpus.length < filterCount
        ? start + filteredGpus.length
        : null,
  };
}

const RequestSchema = z.object({
  keys: z.array(z.string().min(1)).max(200),
});

/**
 * GET /api/favorites/rows
 * Fetches favorite rows with database-level sorting and pagination
 * Uses JOIN to combine userFavorites with gpuPricing
 * Follows TanStack Table's recommended pattern for server-side pagination
 *
 * Query params:
 * - cursor: number (offset for pagination)
 * - size: number (page size, default 50)
 * - sort: string (format: "id.desc" or "id.asc")
 *
 * @returns 200 with paginated favorite GPU rows
 * @returns 401 if not authenticated
 * @returns 500 on server error
 */
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

    // Parse query parameters
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = searchParamsCache.parse(Object.fromEntries(_search));

    const cursor = search.cursor ?? null;
    // Validate and clamp size parameter to prevent memory abuse
    // Min: 1, Max: 200, Default: 50
    const size = Math.min(Math.max(1, search.size ?? 50), 200);
    const normalizedSearch: SearchParamsType = {
      ...search,
      cursor,
      size,
    };

    // Get paginated rows with database-level sorting and pagination
    // This only loads the rows needed for the current page, not all favorites
    // Cached server-side with 12 hour TTL to reduce DB load
    const result = await getFavoriteRowsDirect(
      session.user.id,
      normalizedSearch,
    );
    return NextResponse.json(result, {
      headers: {
        // Use private cache since this is user-specific data
        // This prevents Vercel edge/CDN from caching responses
        ...PRIVATE_NO_STORE_HEADERS,
      },
    });
  } catch (error) {
    logger.error("[GET /api/favorites/rows] Failed to fetch favorite rows", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}

/**
 * POST /api/favorites/rows
 * Fetches rows for specific favorite stable keys (used for optimistic updates)
 * Note: Keys are stable keys (not UUIDs) since GPU UUIDs change between scrapes
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Keys are stable keys, not UUIDs
    const rows = await gpuPricingCache.getGpusByStableKeys(parsed.data.keys);
    return NextResponse.json({ rows });
  } catch (error) {
    logger.error("[POST /api/favorites/rows] Failed to resolve rows", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
