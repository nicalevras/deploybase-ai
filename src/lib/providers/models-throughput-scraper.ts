import { db } from "@/db/client";
import { aiModels } from "@/db/schema";
import { sql } from "drizzle-orm";
import { modelThroughputCache, type ThroughputSampleInput } from "@/lib/models-throughput-cache";
import {
  fetchOpenRouterEndpointStats,
  mapConcurrent,
  OpenRouterHttpError,
  parseOpenRouterNumber,
} from "@/lib/providers/openrouter-api";

interface ThroughputScrapeResult {
  permaslugsRequested: number;
  permaslugsProcessed: number;
  permaslugsFailed: number;
  samplesStored: number;
  clearedSamples: number;
  modelsReset: number;
  modelsUpdated: number;
  touchedPermaslugs: string[];
  errors: { permaslug: string; message: string }[];
}

const SCRAPE_CONCURRENCY = 10;

function createObservedAt(date = new Date()): Date {
  const observedAt = new Date(date);
  observedAt.setSeconds(0, 0);
  return observedAt;
}

class ModelsThroughputScraper {
  private async fetchPermaslug(
    permaslug: string,
    observedAt = createObservedAt(),
  ): Promise<ThroughputSampleInput[]> {
    try {
      const rows = await fetchOpenRouterEndpointStats(permaslug);
      const samples: ThroughputSampleInput[] = [];

      for (const row of rows) {
        if (!row.id) continue;
        const throughput = parseOpenRouterNumber(row.stats?.p50_throughput);
        if (throughput === null) continue;

        samples.push({
          permaslug,
          endpointId: row.id,
          observedAt,
          throughput,
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

  async scrapeAll(limit?: number): Promise<ThroughputScrapeResult> {
    const permaslugs = await this.getUniquePermaslugs();
    const pending = typeof limit === "number" ? permaslugs.slice(0, Math.max(limit, 0)) : permaslugs;
    const touchedPermaslugs = new Set<string>();
    const observedAt = createObservedAt();

    const stats: ThroughputScrapeResult = {
      permaslugsRequested: pending.length,
      permaslugsProcessed: 0,
      permaslugsFailed: 0,
      samplesStored: 0,
      clearedSamples: 0,
      modelsReset: 0,
      modelsUpdated: 0,
      touchedPermaslugs: [],
      errors: [],
    };

    const results = await mapConcurrent(
      pending,
      async (permaslug) => {
        try {
          const samples = await this.fetchPermaslug(permaslug, observedAt);
          const stored = samples.length ? await modelThroughputCache.upsertSamples(samples) : 0;
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
    stats.modelsUpdated = await modelThroughputCache.syncLatestThroughputToModels();
    return stats;
  }

  async scrapePermaslug(permaslug: string): Promise<number> {
    if (!permaslug) return 0;
    const samples = await this.fetchPermaslug(permaslug);
    if (!samples.length) return 0;
    const stored = await modelThroughputCache.upsertSamples(samples);
    await modelThroughputCache.syncLatestThroughputToModels();
    return stored;
  }
}

export const modelsThroughputScraper = new ModelsThroughputScraper();
