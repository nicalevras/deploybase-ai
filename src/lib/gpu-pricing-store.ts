import { createHash } from "crypto";
import { db } from "@/db/client";
import { gpuPricing } from "@/db/schema";
import { stableGpuKey } from "@/features/data-explorer/stable-keys";
import {
  gpuPriceHistoryStore,
  type GpuPriceSampleInput,
} from "@/lib/gpu-price-history-store";
import { commitGpuSnapshotAtomically } from "@/lib/gpu-snapshot-replacement";
import { logger } from "@/lib/logger";
import { normalizeGpuModel } from "@/lib/normalize-gpu-model";
import { normalizeObservedAt } from "@/lib/normalize-observed-at";
import type { RowWithId } from "@/types/api";
import type {
  PriceRow,
  Provider,
  ProviderResult,
  ProviderSnapshot,
} from "@/types/pricing";
import { and, eq, sql } from "drizzle-orm";

type GpuPricingRow = typeof gpuPricing.$inferSelect;
type GpuPricingInsert = typeof gpuPricing.$inferInsert;
type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Helper type to access optional fields from PriceRow union
type PriceRowFields = {
  gpu_model?: string;
  item?: string;
  sku?: string;
  gpu_count?: number;
  vram_gb?: number;
  type?: "Virtual Machine" | "Bare Metal" | "VM";
  price_hour_usd?: number;
  price_usd?: number;
  price_month_usd?: number;
};

function computeRowId(
  provider: string,
  observedAt: string,
  row: PriceRow,
): string {
  const hashInput = JSON.stringify({ provider, observed_at: observedAt, row });
  return createHash("sha256").update(hashInput).digest("hex");
}

function toRowWithId(record: GpuPricingRow): RowWithId {
  const data = record.data as PriceRow;
  const observedAtIso = normalizeObservedAt(record.observedAt);
  return {
    uuid: record.id,
    ...data,
    provider: record.provider,
    observed_at: observedAtIso,
    stable_key: record.stableKey,
  } as RowWithId;
}

function getPriceUsd(row: PriceRow): number | null {
  const rowData = row as PriceRowFields;
  const priceCandidates = [
    rowData.price_hour_usd,
    rowData.price_usd,
    rowData.price_month_usd,
  ];

  for (const candidate of priceCandidates) {
    if (typeof candidate === "number" && !Number.isNaN(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

const INSERT_CHUNK_SIZE = 100;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class GpuPricingStore {
  constructor(
    private readonly database = db,
    private readonly historyStore = gpuPriceHistoryStore,
  ) {}

  /**
   * Replace all GPU pricing data with the latest scrape results.
   * Current pricing and history are committed together so readers never observe
   * an empty or partially replaced snapshot.
   */
  async replaceAll(
    providerResults: ProviderResult[],
  ): Promise<{ stored: number; touchedStableKeys: string[] }> {
    const nonemptyResults = providerResults.filter(
      (result) => result.rows.length > 0,
    );
    if (!nonemptyResults.length) {
      throw new Error(
        "Refusing to replace GPU pricing with an empty snapshot.",
      );
    }

    logger.info(
      `[GpuPricingStore] Replacing GPU pricing data for ${nonemptyResults.length} providers...`,
    );

    const historySamples: GpuPriceSampleInput[] = [];
    const rowsToInsert: GpuPricingInsert[] = [];

    for (const result of nonemptyResults) {
      const observedAtIso = normalizeObservedAt(result.observedAt);
      const version = typeof result.version === "number" ? result.version : 1;

      for (const row of result.rows) {
        // Normalize gpu_model before hashing, stable key, and DB storage
        const rowData = row as PriceRowFields;
        if (rowData.gpu_model) {
          (row as Record<string, unknown>).gpu_model = normalizeGpuModel(
            rowData.gpu_model,
          );
          rowData.gpu_model = (row as Record<string, unknown>)
            .gpu_model as string;
        }

        const id = computeRowId(result.provider, observedAtIso, row);
        const stableKey = stableGpuKey({
          provider: result.provider,
          gpu_model: rowData.gpu_model,
          item: rowData.item,
          sku: rowData.sku,
          gpu_count: rowData.gpu_count,
          vram_gb: rowData.vram_gb,
          type: rowData.type === "Virtual Machine" ? "VM" : rowData.type,
        });

        rowsToInsert.push({
          id,
          provider: result.provider,
          observedAt: new Date(observedAtIso),
          version,
          sourceHash: result.sourceHash,
          data: row,
          stableKey,
        });

        const priceUsd = getPriceUsd(row);
        if (priceUsd != null) {
          historySamples.push({
            stableKey,
            provider: result.provider,
            observedAt: new Date(observedAtIso),
            priceUsd,
          });
        }
      }
    }

    const touchedStableKeys = await commitGpuSnapshotAtomically<
      DatabaseTransaction,
      GpuPricingInsert,
      GpuPriceSampleInput
    >({
      rows: rowsToInsert,
      historySamples,
      transaction: (work) => this.database.transaction(work),
      replaceCurrent: async (tx, rows) => {
        await tx.delete(gpuPricing);
        for (const chunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
          await tx.insert(gpuPricing).values(chunk);
        }
      },
      appendHistory: (tx, samples) =>
        this.historyStore.appendSamples(samples, tx),
    });

    try {
      await this.historyStore.pruneThirtyDaysWindow();
    } catch (error) {
      logger.error(
        "[GpuPricingStore] Failed to prune GPU price history after commit",
        error,
      );
    }

    logger.info(
      `[GpuPricingStore] Stored ${rowsToInsert.length} GPU pricing rows`,
    );
    return { stored: rowsToInsert.length, touchedStableKeys };
  }

  async getAllRows(): Promise<RowWithId[]> {
    const records = await this.database
      .select()
      .from(gpuPricing)
      .orderBy(gpuPricing.provider, gpuPricing.id);

    return records.map(toRowWithId);
  }

  async getRowsByProvider(provider: Provider): Promise<RowWithId[]> {
    const records = await this.database
      .select()
      .from(gpuPricing)
      .where(eq(gpuPricing.provider, provider))
      .orderBy(gpuPricing.id);

    return records.map(toRowWithId);
  }

  async getProviderSnapshots(): Promise<ProviderSnapshot[]> {
    const records = await this.database.select().from(gpuPricing);
    const map = new Map<
      Provider,
      { observedAt: Date; version: number; rows: PriceRow[] }
    >();

    for (const record of records) {
      const provider = record.provider as Provider;
      const entry = map.get(provider);
      if (!entry) {
        map.set(provider, {
          observedAt: record.observedAt,
          version: record.version,
          rows: [record.data as PriceRow],
        });
      } else {
        entry.rows.push(record.data as PriceRow);
        if (record.observedAt > entry.observedAt) {
          entry.observedAt = record.observedAt;
        }
        entry.version = Math.max(entry.version, record.version);
      }
    }

    return Array.from(map.entries()).map(([provider, value]) => ({
      provider,
      version: value.version,
      last_updated: normalizeObservedAt(value.observedAt),
      rows: value.rows,
    }));
  }

  async getSnapshotByProvider(
    provider: Provider,
  ): Promise<ProviderSnapshot | null> {
    const records = await this.database
      .select()
      .from(gpuPricing)
      .where(eq(gpuPricing.provider, provider));

    if (!records.length) return null;

    let latestObserved = records[0].observedAt;
    let version = records[0].version;
    const rows: PriceRow[] = [];

    for (const record of records) {
      rows.push(record.data as PriceRow);
      if (record.observedAt > latestObserved) {
        latestObserved = record.observedAt;
      }
      version = Math.max(version, record.version);
    }

    return {
      provider,
      version,
      last_updated: normalizeObservedAt(latestObserved),
      rows,
    };
  }

  async getInstance(
    provider: Provider,
    instanceId: string,
  ): Promise<PriceRow | null> {
    const records = await this.database
      .select()
      .from(gpuPricing)
      .where(
        and(
          eq(gpuPricing.provider, provider),
          sql`${gpuPricing.data}->>'instance_id' = ${instanceId}`,
        ),
      )
      .limit(1);

    if (!records.length) return null;
    return records[0].data as PriceRow;
  }

  async getCacheStats(): Promise<{
    totalRows: number;
    providers: string[];
    lastScrapedAt?: string;
  }> {
    const [totalResult] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(gpuPricing);

    const providers = await this.database
      .select({ provider: gpuPricing.provider })
      .from(gpuPricing)
      .groupBy(gpuPricing.provider);

    const [latestResult] = await this.database
      .select({ observedAt: sql<string>`max(observed_at)` })
      .from(gpuPricing);

    return {
      totalRows: totalResult?.count ?? 0,
      providers: providers.map((row) => row.provider),
      lastScrapedAt: latestResult?.observedAt ?? undefined,
    };
  }

  async clearAll(): Promise<number> {
    const deleted = await this.database
      .delete(gpuPricing)
      .returning({ id: gpuPricing.id });
    return deleted.length;
  }
}

export const gpuPricingStore = new GpuPricingStore();
