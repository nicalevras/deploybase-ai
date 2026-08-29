import { db } from "@/db/client";
import { userModelFavorites } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http-cache";
import { logger } from "@/lib/logger";
import {
  getModelFavoritesCacheTag,
  getModelFavoritesRateLimitKey,
  MODEL_FAVORITES_CACHE_TTL,
} from "@/lib/model-favorites/constants";
import { writeLimiter } from "@/lib/redis/ratelimit";
import type {
  ModelFavoriteKey,
  ModelFavoritesRequest,
  ModelFavoritesResponse,
} from "@/types/model-favorites";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type UserModelFavoriteRow = {
  id: string;
  userId: string;
  modelId: string;
  createdAt: Date | null;
};

function buildRateHeaders(limit?: number, remaining?: number, reset?: number) {
  const headers: Record<string, string> = {};
  if (typeof limit === "number") headers["X-RateLimit-Limit"] = String(limit);
  if (typeof remaining === "number")
    headers["X-RateLimit-Remaining"] = String(remaining);
  if (typeof reset === "number") headers["X-RateLimit-Reset"] = String(reset);
  return headers;
}

export async function GET() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    // Use unstable_cache to leverage server-side cache
    // Cache check happens here (in API route), not blocking SSR
    // If cache exists: returns immediately
    // If cache misses: queries DB and caches result (non-blocking for SSR since this is an API route)
    const getCachedFavorites = unstable_cache(
      async (userId: string) => {
        const rows = await db
          .select()
          .from(userModelFavorites)
          .where(eq(userModelFavorites.userId, userId));

        const typedRows = rows as unknown as UserModelFavoriteRow[];
        return (typedRows || []).map((r) => r.modelId as ModelFavoriteKey);
      },
      ["model-favorites:api", session.user.id],
      {
        revalidate: MODEL_FAVORITES_CACHE_TTL,
        tags: [getModelFavoritesCacheTag(session.user.id)],
      },
    );

    const favorites = await getCachedFavorites(session.user.id);

    return NextResponse.json<ModelFavoritesResponse>(
      { favorites },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    logger.error("[GET /api/models/favorites] Failed to fetch favorites", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await writeLimiter.limit(
      getModelFavoritesRateLimitKey(session.user.id),
    );
    if (!rate.success) {
      logger.warn("[POST /api/models/favorites] Rate limit exceeded", {
        userId: session.user.id,
        limit: rate.limit,
        reset: rate.reset,
      });

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset),
        },
      );
    }

    const BodySchema = z.object({
      modelIds: z.array(z.string().min(1)).min(1).max(50),
    });
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warn("[POST /api/models/favorites] Invalid request body", {
        userId: session.user.id,
        errors: parsed.error.errors,
      });

      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const modelIds = Array.from(
      new Set(parsed.data.modelIds),
    ) as ModelFavoriteKey[];

    const favoritesToInsert = modelIds.map((modelId) => ({
      id: crypto.randomUUID(),
      userId: session.user.id,
      modelId,
    }));

    await db
      .insert(userModelFavorites)
      .values(favoritesToInsert)
      .onConflictDoNothing();

    try {
      revalidateTag(getModelFavoritesCacheTag(session.user.id), "max");
      revalidateTag("model-favorites", "max"); // Invalidate favorites rows cache
      revalidatePath("/api/models/favorites/rows"); // Invalidate route cache for Vercel edge/CDN
    } catch (revalidateError) {
      logger.error("[POST /api/models/favorites] Cache revalidation failed", {
        userId: session.user.id,
        error:
          revalidateError instanceof Error
            ? revalidateError.message
            : String(revalidateError),
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) },
    );
  } catch (error) {
    logger.error("[POST /api/models/favorites] Database operation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await writeLimiter.limit(
      getModelFavoritesRateLimitKey(session.user.id),
    );
    if (!rate.success) {
      logger.warn("[DELETE /api/models/favorites] Rate limit exceeded", {
        userId: session.user.id,
        limit: rate.limit,
        reset: rate.reset,
      });

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset),
        },
      );
    }

    const BodySchema = z.object({
      modelIds: z.array(z.string().min(1)).min(1).max(50),
    });
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warn("[DELETE /api/models/favorites] Invalid request body", {
        userId: session.user.id,
        errors: parsed.error.errors,
      });

      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const modelIds = Array.from(
      new Set(parsed.data.modelIds),
    ) as ModelFavoriteKey[];

    await db
      .delete(userModelFavorites)
      .where(
        and(
          eq(userModelFavorites.userId, session.user.id),
          inArray(userModelFavorites.modelId, modelIds),
        ),
      );

    try {
      revalidateTag(getModelFavoritesCacheTag(session.user.id), "max");
      revalidateTag("model-favorites", "max"); // Invalidate favorites rows cache
      revalidatePath("/api/models/favorites/rows"); // Invalidate route cache for Vercel edge/CDN
    } catch (revalidateError) {
      logger.error("[DELETE /api/models/favorites] Cache revalidation failed", {
        userId: session.user.id,
        error:
          revalidateError instanceof Error
            ? revalidateError.message
            : String(revalidateError),
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) },
    );
  } catch (error) {
    logger.error("[DELETE /api/models/favorites] Database operation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
