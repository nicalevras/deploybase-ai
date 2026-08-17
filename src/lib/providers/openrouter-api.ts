const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_CONCURRENCY = 10;

const OPENROUTER_USER_AGENT = "Mozilla/5.0 (compatible; DeploybaseOpenRouterScraper/1.0)";

export interface OpenRouterCatalogModel {
  id?: string;
  canonical_slug?: string;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    instruct_type?: string | null;
    modality?: string | null;
  };
  pricing?: Record<string, unknown>;
  top_provider?: {
    context_length?: number | null;
    max_completion_tokens?: number | null;
    is_moderated?: boolean | null;
  };
  supported_parameters?: unknown[];
  default_parameters?: Record<string, unknown>;
  links?: {
    details?: string | null;
  };
}

interface OpenRouterCatalogResponse {
  data?: OpenRouterCatalogModel[];
  links?: {
    next?: string | null;
  };
}

export interface OpenRouterEndpointStats {
  endpoint_id?: string;
  p50_throughput?: number | string | null;
  p75_throughput?: number | string | null;
  p90_throughput?: number | string | null;
  p95_throughput?: number | string | null;
  p99_throughput?: number | string | null;
  p50_latency?: number | string | null;
  p75_latency?: number | string | null;
  p90_latency?: number | string | null;
  p95_latency?: number | string | null;
  p99_latency?: number | string | null;
  request_count?: number | string | null;
  window_minutes?: number | string | null;
}

export interface OpenRouterEndpointModel {
  slug?: string | null;
  name?: string | null;
  short_name?: string | null;
  author?: string | null;
  author_display_name?: string | null;
  description?: string | null;
  model_version_group_id?: string | null;
  context_length?: number | null;
  input_modalities?: string[] | null;
  output_modalities?: string[] | null;
  has_text_output?: boolean | null;
  group?: string | null;
  instruct_type?: string | null;
  permaslug?: string | null;
  features?: Record<string, unknown> | null;
  max_completion_tokens?: number | null;
}

export interface OpenRouterEndpointRow {
  id?: string;
  name?: string;
  context_length?: number | null;
  model?: OpenRouterEndpointModel | null;
  model_variant_slug?: string | null;
  model_variant_permaslug?: string | null;
  provider_name?: string | null;
  provider_display_name?: string | null;
  provider_slug?: string | null;
  provider_info?: {
    name?: string | null;
    displayName?: string | null;
    slug?: string | null;
  } | null;
  provider_model_id?: string | null;
  quantization?: string | null;
  variant?: string | null;
  max_prompt_tokens?: number | null;
  max_completion_tokens?: number | null;
  supported_parameters?: unknown[] | null;
  pricing?: Record<string, unknown> | null;
  display_pricing?: unknown;
  pricing_json?: Record<string, unknown> | null;
  features?: Record<string, unknown> | null;
  status?: number | null;
  stats?: OpenRouterEndpointStats | null;
  statsByTier?: Record<string, OpenRouterEndpointStats | null> | null;
}

interface OpenRouterEndpointStatsResponse {
  data?: OpenRouterEndpointRow[];
}

export class OpenRouterHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "OpenRouterHttpError";
  }
}

export const parseOpenRouterNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getOpenRouterPermaslug = (model: OpenRouterCatalogModel): string | null => {
  if (typeof model.canonical_slug === "string" && model.canonical_slug.length > 0) {
    return model.canonical_slug;
  }
  if (typeof model.id === "string" && model.id.length > 0) {
    return model.id;
  }
  return null;
};

export async function mapConcurrent<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await mapper(items[current], current);
      }
    }),
  );

  return results;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status: number) {
  return status === 429 || status >= 500;
}

async function fetchJsonWithRetry<T>(
  url: string,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  }: {
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "User-Agent": OPENROUTER_USER_AGENT,
          "Referer": "https://deploybase.ai/",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const message = `OpenRouter HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`;
        const error = new OpenRouterHttpError(message, response.status, url);
        if (isTransientStatus(response.status) && attempt < retries) {
          lastError = error;
          await sleep(350 * (attempt + 1));
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof OpenRouterHttpError && !isTransientStatus(error.status)) {
        throw error;
      }
      if (attempt >= retries) {
        throw error;
      }
      await sleep(350 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenRouter request failed");
}

export async function fetchOpenRouterCatalog(limit?: number): Promise<OpenRouterCatalogModel[]> {
  const models: OpenRouterCatalogModel[] = [];
  let nextUrl: string | null = "https://openrouter.ai/api/v1/models?output_modalities=all";

  while (nextUrl) {
    const response: OpenRouterCatalogResponse = await fetchJsonWithRetry<OpenRouterCatalogResponse>(nextUrl);
    const pageModels = Array.isArray(response.data) ? response.data : [];
    models.push(...pageModels);

    if (typeof limit === "number" && limit > 0 && models.length >= limit) {
      return models.slice(0, limit);
    }

    nextUrl = response.links?.next
      ? new URL(response.links.next, "https://openrouter.ai").toString()
      : null;
  }

  return models;
}

export async function fetchOpenRouterEndpointStats(permaslug: string): Promise<OpenRouterEndpointRow[]> {
  const url =
    `https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=${encodeURIComponent(permaslug)}&variant=standard`;
  const response = await fetchJsonWithRetry<OpenRouterEndpointStatsResponse>(url);
  return Array.isArray(response.data) ? response.data : [];
}
