import type { AIModel, ModelScrapeResult } from "@/types/models";
import { logger } from "@/lib/logger";
import {
  fetchOpenRouterCatalog,
  fetchOpenRouterEndpointStats,
  getOpenRouterPermaslug,
  mapConcurrent,
  OpenRouterHttpError,
  parseOpenRouterNumber,
  type OpenRouterCatalogModel,
  type OpenRouterEndpointRow,
} from "@/lib/providers/openrouter-api";

const AUTHOR_MAP: Record<string, string> = {
  "x-ai": "xAI",
  "agentica-org": "Agentica",
  "anthropic": "Anthropic",
  "google": "Google",
  "meta-llama": "Meta",
  "microsoft": "Microsoft",
  "nvidia": "NVIDIA",
  "openai": "OpenAI",
  "perplexity": "Perplexity",
  "ai21": "AI21",
  "aion-labs": "AionLabs",
  "alfredpros": "AlfredPros",
  "allenai": "AllenAI",
  "amazon": "Amazon",
  "arcee-ai": "Arcee AI",
  "arliai": "ArliAI",
  "baidu": "Baidu",
  "bytedance": "ByteDance",
  "deepcogito": "Deep Cogito",
  "deepseek": "DeepSeek",
  "cohere": "Cohere",
  "cognitivecomputations": "Cognitive Computations",
  "eleutherai": "EleutherAI",
  "alpindale": "Alpindale",
  "inception": "Inception",
  "inclusionai": "inclusionAI",
  "inflection": "Inflection",
  "liquid": "Liquid",
  "anthracite-org": "Anthracite",
  "mancer": "Mancer",
  "meituan": "Meituan",
  "minimax": "MiniMax",
  "mistralai": "Mistral",
  "moonshotai": "MoonshotAI",
  "morph": "Morph",
  "gryphe": "Gryphe",
  "neversleep": "NeverSleep",
  "nousresearch": "Nous Research",
  "opengvlab": "OpenGVLab",
  "qwen": "Qwen",
  "relace": "Relace",
  "undi95": "Undi",
  "sao10k": "Sao10K",
  "shisa-ai": "Shisa AI",
  "raifle": "rAIfle",
  "stepfun": "StepFun",
  "stepfun-ai": "StepFun",
  "switchpoint": "Switchpoint",
  "tencent": "Tencent",
  "thedrummer": "TheDrummer",
  "thudm": "THUDM",
  "tngtech": "TNG",
  "alibaba": "Alibaba",
  "black-forest-labs": "Black Forest Labs",
  "bytedance-seed": "ByteDance",
  "kwaipilot": "KwaiPilot",
  "sourceful": "Sourceful",
  "upstage": "Upstage",
  "xiaomi": "Xiaomi",
  "z-ai": "Z.AI",
  "baai": "BAAI",
  "deepseek-ai": "DeepSeek",
  "essentialai": "Essential AI",
  "ibm-granite": "IBM",
  "intfloat": "intfloat",
  "nex-agi": "Nex AGI",
  "prime-intellect": "Prime Intellect",
  "sentence-transformers": "Sentence Transformers",
  "thenlper": "thenlper",
  "venice": "Venice",
  "writer": "Writer",
};

const PROVIDER_MAP: Record<string, string> = {
  "WandB": "Weights and Biases",
  "Google": "Google Vertex",
  "Alibaba": "Alibaba Cloud",
  "Mancer 2": "Mancer",
  "Minimax": "MiniMax",
  "Moonshot AI": "MoonshotAI",
  "Nvidia": "NVIDIA",
  "Sail Research": "Sail Research",
};

const MIN_FULL_SCRAPE_ROWS = 500;
const ENDPOINT_FETCH_CONCURRENCY = 10;

interface ModelEndpointScrape {
  permaslug: string;
  rows: OpenRouterEndpointRow[];
  error?: string;
  skipped?: boolean;
}

function sanitizeSlugPart(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || "unknown";
}

function normalizeModality(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function normalizeModalities(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeModality);
}

function normalizeSupportedParameters(values?: unknown[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function transformProviderName(provider: string): string {
  return PROVIDER_MAP[provider] ?? provider;
}

function transformAuthorName(author: string): string {
  return AUTHOR_MAP[author] ?? author;
}

function cleanShortName(value?: string | null, author?: string | null): string | null {
  if (!value) return null;

  let cleaned = value.trim();
  cleaned = cleaned.replace(/\s*\(free\)/gi, "").trim();
  cleaned = cleaned.replace(/\s*\(thinking\)/gi, " Thinking").trim();

  if (author && cleaned.length > 0 && author.toLowerCase() === "deepseek") {
    const cleanedLower = cleaned.toLowerCase();
    const startsWithCodename = /^[A-Za-z]\d/.test(cleaned);
    if (startsWithCodename && !cleanedLower.includes("deepseek")) {
      cleaned = `${author} ${cleaned}`;
    }
  }

  return cleaned.length > 0 ? cleaned : null;
}

function extractProviderName(endpoint: OpenRouterEndpointRow): string {
  const raw =
    endpoint.provider_display_name ||
    endpoint.provider_name ||
    endpoint.provider_info?.displayName ||
    endpoint.provider_info?.name ||
    endpoint.provider_slug ||
    "unknown";

  return transformProviderName(raw);
}

function extractAuthor(endpoint: OpenRouterEndpointRow): string | null {
  const raw = endpoint.model?.author_display_name || endpoint.model?.author;
  return raw ? transformAuthorName(raw) : null;
}

function extractPricing(
  endpoint: OpenRouterEndpointRow,
  catalogModel: OpenRouterCatalogModel,
): Record<string, unknown> {
  if (endpoint.pricing && typeof endpoint.pricing === "object") {
    return endpoint.pricing;
  }
  if (catalogModel.pricing && typeof catalogModel.pricing === "object") {
    return catalogModel.pricing;
  }
  return {};
}

function extractFeatures(
  endpoint: OpenRouterEndpointRow,
  catalogModel: OpenRouterCatalogModel,
): Record<string, unknown> {
  if (endpoint.features && typeof endpoint.features === "object") {
    return endpoint.features;
  }
  if (endpoint.model?.features && typeof endpoint.model.features === "object") {
    return endpoint.model.features;
  }
  if (catalogModel.default_parameters && typeof catalogModel.default_parameters === "object") {
    return { default_parameters: catalogModel.default_parameters };
  }
  return {};
}

function transformEndpointToModel(
  catalogModel: OpenRouterCatalogModel,
  endpoint: OpenRouterEndpointRow,
  permaslug: string,
  scrapedAt: string,
): AIModel | null {
  if (!endpoint.id) {
    return null;
  }

  const provider = extractProviderName(endpoint);
  const author = extractAuthor(endpoint);
  const inputModalities = normalizeModalities(
    endpoint.model?.input_modalities ?? catalogModel.architecture?.input_modalities,
  );
  const outputModalities = normalizeModalities(
    endpoint.model?.output_modalities ?? catalogModel.architecture?.output_modalities,
  );
  const hasTextOutput =
    endpoint.model?.has_text_output === true ||
    outputModalities.some((modality) => modality.toLowerCase() === "text");
  const pricing = extractPricing(endpoint, catalogModel);
  const throughput = parseOpenRouterNumber(endpoint.stats?.p50_throughput);
  const modelName = endpoint.model?.name || catalogModel.name || endpoint.name || undefined;
  const modelShortName = cleanShortName(endpoint.model?.short_name, author) ?? undefined;
  const modelSlug = endpoint.model?.slug || endpoint.model_variant_slug || catalogModel.id || permaslug;
  const slug =
    `${sanitizeSlugPart(provider)}/${sanitizeSlugPart(permaslug || modelSlug)}--endpoint-${sanitizeSlugPart(endpoint.id)}`;

  return {
    id: `openrouter:${endpoint.id}`,
    slug,
    name: modelName,
    shortName: modelShortName,
    author: author ?? undefined,
    description: endpoint.model?.description || catalogModel.description || undefined,
    modelVersionGroupId: endpoint.model?.model_version_group_id || null,
    contextLength:
      endpoint.context_length ??
      endpoint.model?.context_length ??
      catalogModel.context_length ??
      catalogModel.top_provider?.context_length ??
      undefined,
    inputModalities,
    outputModalities,
    hasTextOutput: hasTextOutput ? "true" : "false",
    group: endpoint.model?.group || undefined,
    instructType: endpoint.model?.instruct_type || catalogModel.architecture?.instruct_type || null,
    permaslug,
    endpointId: endpoint.id,
    pricing,
    features: extractFeatures(endpoint, catalogModel),
    provider,
    throughput,
    maxCompletionTokens:
      endpoint.max_completion_tokens ??
      endpoint.model?.max_completion_tokens ??
      catalogModel.top_provider?.max_completion_tokens ??
      null,
    supportedParameters: normalizeSupportedParameters(
      endpoint.supported_parameters ?? catalogModel.supported_parameters,
    ),
    scrapedAt,
  };
}

class ModelsScraper {
  async scrapeAll(limit?: number): Promise<ModelScrapeResult> {
    const startTime = Date.now();
    const isLimitedRun = typeof limit === "number" && limit > 0;
    logger.info(`[ModelsScraper] Starting OpenRouter models scrape${isLimitedRun ? ` (limit: ${limit})` : ""}...`);

    const catalog = await fetchOpenRouterCatalog(limit);
    if (!catalog.length) {
      throw new Error("OpenRouter returned an empty model catalog");
    }

    const scrapedAt = new Date().toISOString();
    const endpointResults = await mapConcurrent(
      catalog,
      async (model): Promise<ModelEndpointScrape> => {
        const permaslug = getOpenRouterPermaslug(model);
        if (!permaslug) {
          return { permaslug: "unknown", rows: [], skipped: true, error: "missing permaslug" };
        }

        try {
          const rows = await fetchOpenRouterEndpointStats(permaslug);
          return { permaslug, rows };
        } catch (error) {
          const isNotFound = error instanceof OpenRouterHttpError && error.status === 404;
          return {
            permaslug,
            rows: [],
            skipped: isNotFound,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      ENDPOINT_FETCH_CONCURRENCY,
    );

    const modelByPermaslug = new Map<string, OpenRouterCatalogModel>();
    for (const model of catalog) {
      const permaslug = getOpenRouterPermaslug(model);
      if (permaslug) {
        modelByPermaslug.set(permaslug, model);
      }
    }

    const models: AIModel[] = [];
    let endpointRowsFetched = 0;
    let skippedModels = 0;
    const endpointErrors: { permaslug: string; message: string }[] = [];
    const seenIds = new Set<string>();

    for (const result of endpointResults) {
      endpointRowsFetched += result.rows.length;
      if (result.skipped || result.error) {
        skippedModels += 1;
      }
      if (result.error && !result.skipped) {
        endpointErrors.push({ permaslug: result.permaslug, message: result.error });
      }

      const catalogModel = modelByPermaslug.get(result.permaslug);
      if (!catalogModel) continue;

      for (const endpoint of result.rows) {
        const transformed = transformEndpointToModel(catalogModel, endpoint, result.permaslug, scrapedAt);
        if (!transformed || seenIds.has(transformed.id)) continue;
        seenIds.add(transformed.id);
        models.push(transformed);
      }
    }

    if (!isLimitedRun && models.length < MIN_FULL_SCRAPE_ROWS) {
      throw new Error(
        `OpenRouter scrape produced only ${models.length} rows; refusing to replace existing AI models`,
      );
    }

    const sourceHash = this.generateHash(JSON.stringify(models));
    const duration = Date.now() - startTime;
    logger.info(
      JSON.stringify({
        event: "models.openrouter.scrape.completed",
        catalogModels: catalog.length,
        endpointRowsFetched,
        modelsScraped: models.length,
        skippedModels,
        endpointErrors: endpointErrors.slice(0, 20),
        duration,
      }),
    );

    if (endpointErrors.length > 0) {
      logger.warn(`[ModelsScraper] ${endpointErrors.length} endpoint stats requests failed`);
    }

    return {
      models,
      scrapedAt,
      sourceHash,
    };
  }

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i += 1) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return hash.toString(36);
  }
}

export const modelsScraper = new ModelsScraper();
