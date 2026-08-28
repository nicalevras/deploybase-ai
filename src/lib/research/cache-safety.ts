import { CACHE_SIZE_LIMIT_BYTES } from "../cache/constants.ts";
import { logger } from "../logger.ts";

export const RESEARCH_CACHE_WARNING_BYTES = Math.floor(
  CACHE_SIZE_LIMIT_BYTES * 0.75,
);

export class ResearchCacheSizeError extends Error {
  readonly dataset: string;
  readonly estimatedSizeBytes: number;
  readonly rowCount: number;

  constructor(dataset: string, estimatedSizeBytes: number, rowCount: number) {
    super(
      `${dataset} cache size (${estimatedSizeBytes} bytes) exceeds limit (${CACHE_SIZE_LIMIT_BYTES} bytes)`,
    );
    this.name = "ResearchCacheSizeError";
    this.dataset = dataset;
    this.estimatedSizeBytes = estimatedSizeBytes;
    this.rowCount = rowCount;
  }
}

export function assertResearchCacheSize<T>(
  dataset: string,
  rows: T[],
): T[] {
  const estimatedSizeBytes = Buffer.byteLength(JSON.stringify(rows), "utf8");
  const details = {
    dataset,
    estimatedSizeBytes,
    limitBytes: CACHE_SIZE_LIMIT_BYTES,
    rowCount: rows.length,
  };

  if (estimatedSizeBytes > CACHE_SIZE_LIMIT_BYTES) {
    logger.error("[Research] Cache size limit exceeded", details);
    throw new ResearchCacheSizeError(
      dataset,
      estimatedSizeBytes,
      rows.length,
    );
  }

  if (estimatedSizeBytes >= RESEARCH_CACHE_WARNING_BYTES) {
    logger.warn("[Research] Cache size approaching limit", details);
  }

  return rows;
}

export function isResearchCacheSizeError(
  error: unknown,
): error is ResearchCacheSizeError {
  return (
    error instanceof ResearchCacheSizeError ||
    (error instanceof Error && error.name === "ResearchCacheSizeError")
  );
}

export async function readWithResearchCacheFallback<T>(
  dataset: string,
  cachedRead: () => Promise<T>,
  directRead: () => Promise<T>,
): Promise<T> {
  try {
    return await cachedRead();
  } catch (error) {
    if (!isResearchCacheSizeError(error)) throw error;
    logger.error(`[Research] ${dataset} cache unavailable; using a direct read`, {
      error: error.message,
    });
    return directRead();
  }
}
