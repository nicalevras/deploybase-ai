import { stableToolKey } from "@/features/data-explorer/stable-keys";
import { modelsSearchParamsCache } from "@/features/data-explorer/models/models-search-params";
import { searchParamsCache } from "@/features/data-explorer/table/search-params";
import { getProviderDisplayName } from "@/features/data-explorer/table/provider-logos";
import { toolsSearchParamsCache } from "@/features/data-explorer/tools/tools-search-params";
import { getAllArticleMetadata } from "@/lib/articles-loader";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { logger } from "@/lib/logger";
import { modelsCache } from "@/lib/models-cache";
import { getReadRateLimitKey, readLimiter } from "@/lib/redis/ratelimit";
import type {
  FederatedSearchResponse,
  HeaderSearchResult,
} from "@/lib/search-types";
import { toolsCache } from "@/lib/tools-cache";

const QUERY_LIMIT = 12;
const RESULT_LIMIT = 3;

type SearchableArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  keywords: string[];
};

function getArticleIndex(): SearchableArticle[] {
  return getAllArticleMetadata().map((article) => ({
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category ?? "Research",
        date: article.date,
        keywords: article.keywords ?? [],
      }));
}

function buildSearchHref(pathname: string, query: string, uuid?: string) {
  const params = new URLSearchParams({ search: query });
  if (uuid) params.set("uuid", uuid);
  return `${pathname}?${params.toString()}`;
}

function relevanceScore(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = query.toLowerCase();
  let score = 100;

  values.forEach((value, index) => {
    const normalizedValue = value?.toLowerCase().trim();
    if (!normalizedValue) return;
    if (normalizedValue === normalizedQuery) score = Math.min(score, index);
    else if (normalizedValue.startsWith(normalizedQuery)) {
      score = Math.min(score, 10 + index);
    } else if (normalizedValue.includes(normalizedQuery)) {
      score = Math.min(score, 20 + index);
    }
  });

  return score;
}

function takeUnique<T>(
  rows: T[],
  getKey: (row: T) => string,
  limit = RESULT_LIMIT,
) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const row of rows) {
    const key = getKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(row);
    if (output.length === limit) break;
  }

  return output;
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value;
  logger.warn("[FederatedSearch] Search source failed", {
    error:
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason),
  });
  return fallback;
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (query.length < 2) {
    return Response.json({ error: "Search requires at least two characters" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rate = await readLimiter.limit(getReadRateLimitKey(ip));
  if (!rate.success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const gpuSearch = searchParamsCache.parse({
    search: query,
    size: String(QUERY_LIMIT),
    cursor: "0",
  });
  const modelSearch = modelsSearchParamsCache.parse({
    search: query,
    size: String(QUERY_LIMIT),
    cursor: "0",
  });
  const toolSearch = toolsSearchParamsCache.parse({
    search: query,
    size: String(QUERY_LIMIT),
    cursor: "0",
  });

  const [gpuResult, modelResult, toolResult] = await Promise.allSettled([
    gpuPricingCache.getGpusFiltered(gpuSearch),
    modelsCache.getModelsFiltered(modelSearch),
    toolsCache.getToolsFiltered(toolSearch),
  ]);

  const gpus = settledValue(gpuResult, {
    data: [],
    totalCount: 0,
    filterCount: 0,
  });
  const models = settledValue(modelResult, {
    data: [],
    totalCount: 0,
    filterCount: 0,
  });
  const tools = settledValue(toolResult, {
    data: [],
    totalCount: 0,
    filterCount: 0,
  });

  const gpuRows = [...gpus.data].sort(
    (a, b) =>
      relevanceScore(query, [a.gpu_model, a.item, a.provider]) -
      relevanceScore(query, [b.gpu_model, b.item, b.provider]),
  );
  const gpuResults: HeaderSearchResult[] = takeUnique(
    gpuRows,
    (row) =>
      [row.provider, row.gpu_model ?? row.item, row.gpu_count]
        .filter(Boolean)
        .join(":"),
  ).map((row) => {
    const model = row.gpu_model ?? row.item ?? "GPU instance";
    const provider = getProviderDisplayName(row.provider);
    const count = row.gpu_count ? `${row.gpu_count} GPU${row.gpu_count === 1 ? "" : "s"}` : null;
    const price =
      typeof row.price_hour_usd === "number"
        ? `$${row.price_hour_usd.toFixed(2)}/hr`
        : null;
    return {
      id: row.uuid,
      kind: "gpu",
      title: model,
      description: [provider, count, price].filter(Boolean).join(" · "),
      href: buildSearchHref("/gpus", query, row.uuid),
      provider: row.provider,
      model,
    };
  });

  const modelRows = [...models.data].sort(
    (a, b) =>
      relevanceScore(query, [a.shortName, a.name, a.author, a.provider]) -
      relevanceScore(query, [b.shortName, b.name, b.author, b.provider]),
  );
  const modelResults: HeaderSearchResult[] = takeUnique(
    modelRows,
    (row) => row.shortName ?? row.name ?? row.slug,
  ).map((row) => {
    const model = row.shortName ?? row.name ?? row.slug;
    const outputPrice =
      typeof row.completionPrice === "number"
        ? `$${(row.completionPrice * 1_000_000).toFixed(2)}/1M output`
        : null;
    return {
      id: row.id,
      kind: "llm",
      title: model,
      description: [row.author, row.provider, outputPrice]
        .filter(Boolean)
        .join(" · "),
      href: buildSearchHref(
        "/llms",
        query,
        String(row.id).trim().replace(/\s+/g, "/"),
      ),
      provider: row.provider,
      model,
      author: row.author ?? row.provider,
    };
  });

  const toolRows = [...tools.data].sort(
    (a, b) =>
      relevanceScore(query, [a.name, a.developer, a.category]) -
      relevanceScore(query, [b.name, b.developer, b.category]),
  );
  const toolResults: HeaderSearchResult[] = takeUnique(
    toolRows,
    (row) => row.stableKey ?? String(row.id),
  ).map((row) => {
    const uuid = stableToolKey({
      stable_key: row.stableKey,
      id: row.id,
      name: row.name,
      developer: row.developer,
      category: row.category,
    });
    return {
      id: uuid,
      kind: "tool",
      title: row.name ?? "MLOps tool",
      description: [row.developer, row.category].filter(Boolean).join(" · "),
      href: buildSearchHref("/tools", query, uuid),
    };
  });

  const matchingArticles = getArticleIndex()
    .filter((article) =>
      [
        article.title,
        article.description,
        article.category,
        article.keywords.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const relevance =
        relevanceScore(query, [a.title, a.category, a.description]) -
        relevanceScore(query, [b.title, b.category, b.description]);
      return relevance || Date.parse(b.date) - Date.parse(a.date);
    });
  const articleResults: HeaderSearchResult[] = matchingArticles
    .slice(0, RESULT_LIMIT)
    .map((article) => ({
      id: article.slug,
      kind: "article",
      title: article.title,
      description: article.category,
      href: `/articles/${article.slug}`,
    }));

  const response: FederatedSearchResponse = {
    query,
    sections: {
      gpus: {
        label: "GPUs",
        total: gpus.filterCount,
        viewAllHref: buildSearchHref("/gpus", query),
        results: gpuResults,
      },
      llms: {
        label: "LLMs",
        total: models.filterCount,
        viewAllHref: buildSearchHref("/llms", query),
        results: modelResults,
      },
      tools: {
        label: "MLOps",
        total: tools.filterCount,
        viewAllHref: buildSearchHref("/tools", query),
        results: toolResults,
      },
      articles: {
        label: "Research",
        total: matchingArticles.length,
        viewAllHref: buildSearchHref("/articles/search", query),
        results: articleResults,
      },
    },
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
