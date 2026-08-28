import { db } from "@/db/client";
import { gpuPriceSamples, gpuPricing } from "@/db/schema";
import {
  buildGpuMarketHistorySeries,
  buildGpuOffer,
} from "@/lib/research/analytics";
import { and, asc, eq, gte, inArray } from "drizzle-orm";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface GpuPriceHistoryPoint {
  observedAt: string;
  priceUsd: number;
}

class GpuPriceHistoryCache {
  async getSeries(stableKey: string): Promise<GpuPriceHistoryPoint[]> {
    if (!stableKey) {
      return [];
    }

    const threshold = new Date(Date.now() - THIRTY_DAYS_MS);

    const rows = await db
      .select({
        observedAt: gpuPriceSamples.observedAt,
        priceUsd: gpuPriceSamples.priceUsd,
      })
      .from(gpuPriceSamples)
      .where(
        and(
          eq(gpuPriceSamples.stableKey, stableKey),
          gte(gpuPriceSamples.observedAt, threshold),
        ),
      )
      .orderBy(asc(gpuPriceSamples.observedAt));

    return rows.map((row) => ({
      observedAt: row.observedAt.toISOString(),
      priceUsd: Number(row.priceUsd ?? 0),
    }));
  }

  async getMarketSeries(model: string, type: string) {
    const normalizedModel = model.trim();
    const normalizedType = type.trim() || "All types";
    if (!normalizedModel) return [];

    const currentRows = await db
      .select({
        stableKey: gpuPricing.stableKey,
        provider: gpuPricing.provider,
        observedAt: gpuPricing.observedAt,
        data: gpuPricing.data,
      })
      .from(gpuPricing);

    const offerMetadata = new Map<
      string,
      { provider: string; gpuCount: number }
    >();

    for (const row of currentRows) {
      const offer = buildGpuOffer(row);
      if (
        !offer ||
        offer.model !== normalizedModel ||
        (normalizedType !== "All types" && offer.type !== normalizedType)
      ) {
        continue;
      }

      offerMetadata.set(offer.stableKey, {
        provider: offer.provider,
        gpuCount: offer.gpuCount,
      });
    }

    const stableKeys = [...offerMetadata.keys()];
    if (!stableKeys.length) return [];

    const threshold = new Date(Date.now() - THIRTY_DAYS_MS);
    const rows = await db
      .select({
        stableKey: gpuPriceSamples.stableKey,
        observedAt: gpuPriceSamples.observedAt,
        priceUsd: gpuPriceSamples.priceUsd,
      })
      .from(gpuPriceSamples)
      .where(
        and(
          inArray(gpuPriceSamples.stableKey, stableKeys),
          gte(gpuPriceSamples.observedAt, threshold),
        ),
      )
      .orderBy(asc(gpuPriceSamples.observedAt));

    return buildGpuMarketHistorySeries(
      rows.flatMap((row) => {
        const metadata = offerMetadata.get(row.stableKey);
        return metadata
          ? [
              {
                provider: metadata.provider,
                observedAt: row.observedAt,
                priceUsd: Number(row.priceUsd),
                gpuCount: metadata.gpuCount,
              },
            ]
          : [];
      }),
    );
  }
}

export const gpuPriceHistoryCache = new GpuPriceHistoryCache();
