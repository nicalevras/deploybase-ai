import { db } from "@/db/client";
import { aiModels } from "@/db/schema";
import { sql } from "drizzle-orm";
import { modelLatencyCache, type LatencySampleInput } from "@/lib/models-latency-cache";
import {
  fetchOpenRouterEndpointStats,
  mapConcurrent,
  OpenRouterHttpError,
  parseOpenRouterNumber,
} from "@/lib/providers/openrouter-api";

interface LatencyScrapeResult {
  permaslugsRequested: number;
  permaslugsProcessed: number;
  permaslugsFailed: number;
  samplesStored: number;
  clearedSamples: number;
  touchedPermaslugs: string[];
  errors: { permaslug: string; message: string }[];
}

const SCRAPE_CONCURRENCY = 10;

function createObservedAt(date = new Date()): Date {
  const observedAt = new Date(date);
  observedAt.setSeconds(0, 0);
  return observedAt;
}

class ModelsLatencyScraper {
  private async fetchPermaslug(
    permaslug: string,
    observedAt = createObservedAt(),
  ): Promise<LatencySampleInput[]> {
    try {
      const rows = await fetchOpenRouterEndpointStats(permaslug);
      const samples: LatencySampleInput[] = [];

      for (const row of rows) {
        if (!row.id) continue;
        const latency = parseOpenRouterNumber(row.stats?.p50_latency);
        if (latency === null) continue;

        samples.push({
          permaslug,
          endpointId: row.id,
          observedAt,
          latency,
        });
      }

      return samples;
    } catch (error) {
      if (error instanceof OpenRouterHttpError && error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  private async getUniquePermaslugs(): Promise<string[]> {
    const rows = await db
      .select({ permaslug: aiModels.permaslug })
      .from(aiModels)
      .where(sql`${aiModels.permaslug} IS NOT NULL`);

    return Array.from(
      new Set(
        rows
          .map((row) => row.permaslug)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );
  }

  async scrapeAll(limit?: number): Promise<LatencyScrapeResult> {
    const permaslugs = await this.getUniquePermaslugs();
    const pending = typeof limit === "number" ? permaslugs.slice(0, Math.max(limit, 0)) : permaslugs;
    const touchedPermaslugs = new Set<string>();
    const observedAt = createObservedAt();

    const stats: LatencyScrapeResult = {
      permaslugsRequested: pending.length,
      permaslugsProcessed: 0,
      permaslugsFailed: 0,
      samplesStored: 0,
      clearedSamples: 0,
      touchedPermaslugs: [],
      errors: [],
    };

    const results = await mapConcurrent(
      pending,
      async (permaslug) => {
        try {
          const samples = await this.fetchPermaslug(permaslug, observedAt);
          const stored = samples.length ? await modelLatencyCache.upsertSamples(samples) : 0;
          return { status: "fulfilled" as const, value: { permaslug, stored } };
        } catch (error) {
          return { status: "rejected" as const, permaslug, reason: error };
        }
      },
      SCRAPE_CONCURRENCY,
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        stats.permaslugsProcessed += 1;
        stats.samplesStored += result.value.stored;
        if (result.value.stored > 0) {
          touchedPermaslugs.add(result.value.permaslug);
        }
      } else {
        stats.permaslugsFailed += 1;
        stats.errors.push({
          permaslug: result.permaslug,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    stats.touchedPermaslugs = Array.from(touchedPermaslugs);
    return stats;
  }

  async scrapePermaslug(permaslug: string): Promise<number> {
    if (!permaslug) return 0;
    const samples = await this.fetchPermaslug(permaslug);
    if (!samples.length) return 0;
    return modelLatencyCache.upsertSamples(samples);
  }
}

export const modelsLatencyScraper = new ModelsLatencyScraper();
