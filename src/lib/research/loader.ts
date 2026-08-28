import "server-only";

import { db } from "@/db/client";
import {
  aiModels,
  gpuPricing,
  modelThroughputSamples,
} from "@/db/schema";
import { STANDARD_CACHE_TTL } from "@/lib/cache/constants";
import {
  FEATURED_MODELS,
  FEATURED_RELEASE_START,
  featuredLlmHref,
  featuredLlmPermaslugSet,
  featuredLlmProviderSet,
} from "@/lib/research/featured";
import {
  assertResearchCacheSize,
  readWithResearchCacheFallback,
} from "@/lib/research/cache-safety";
import { logger } from "@/lib/logger";
import {
  buildGpuOffer,
  buildLlmEndpoint,
  hasComparableTextOutput,
  isFeaturedLlmEndpoint,
  pickDefaultGpuModel,
  rankGpuModels,
  selectLowestGpuOffersByProvider,
} from "@/lib/research/analytics";
import type {
  GpuChartOffer,
  GpuChartPayload,
  HomepageResearchManifest,
  LlmChartEndpoint,
  LlmChartPayload,
  ResearchGpuOffer,
  ResearchLlmEndpoint,
  ResearchOption,
  ResearchFreshness,
  ResearchTotals,
} from "@/lib/research/types";
import { toIsoTimestamp } from "@/lib/research/freshness";
import { createHomepageResearchManifest } from "@/lib/research/manifest";
import { count, desc, max } from "drizzle-orm";
import { unstable_cache } from "next/cache";

async function loadGpuOffers(): Promise<ResearchGpuOffer[]> {
  const rows = await db
    .select({
      stableKey: gpuPricing.stableKey,
      provider: gpuPricing.provider,
      observedAt: gpuPricing.observedAt,
      data: gpuPricing.data,
    })
    .from(gpuPricing);

  return rows.flatMap((row) => {
    const offer = buildGpuOffer(row);
    return offer ? [offer] : [];
  });
}

async function loadLlmEndpoints(): Promise<ResearchLlmEndpoint[]> {
  const [modelRows, throughputRows] = await Promise.all([
    db
      .select({
        id: aiModels.id,
        permaslug: aiModels.permaslug,
        endpointId: aiModels.endpointId,
        provider: aiModels.provider,
        shortName: aiModels.shortName,
        name: aiModels.name,
        author: aiModels.author,
        hasTextOutput: aiModels.hasTextOutput,
        outputModalities: aiModels.outputModalities,
        features: aiModels.features,
        completionPrice: aiModels.completionPrice,
        promptPrice: aiModels.promptPrice,
        throughput: aiModels.throughput,
        scrapedAt: aiModels.scrapedAt,
      })
      .from(aiModels),
    db
      .selectDistinctOn([modelThroughputSamples.endpointId], {
        endpointId: modelThroughputSamples.endpointId,
        throughput: modelThroughputSamples.throughput,
        observedAt: modelThroughputSamples.observedAt,
      })
      .from(modelThroughputSamples)
      .orderBy(
        modelThroughputSamples.endpointId,
        desc(modelThroughputSamples.observedAt),
      ),
  ]);

  const throughputByEndpoint = new Map(
    throughputRows.map((row) => [row.endpointId, row] as const),
  );

  return modelRows.flatMap((row) => {
    const throughput = row.endpointId
      ? throughputByEndpoint.get(row.endpointId)
      : undefined;
    const features =
      row.features && typeof row.features === "object"
        ? (row.features as Record<string, unknown>)
        : {};
    const releasedAtValue = features.openrouter_created_at;
    const endpoint = buildLlmEndpoint({
      ...row,
      throughput: throughput?.throughput ?? row.throughput,
      throughputObservedAt: throughput?.observedAt ?? null,
      releasedAt:
        typeof releasedAtValue === "string" ? releasedAtValue : null,
    });

    if (
      !endpoint ||
      !hasComparableTextOutput(endpoint) ||
      !endpoint.throughput ||
      !endpoint.completionPricePerMillion ||
      endpoint.completionPricePerMillion <= 0
    ) {
      return [];
    }

    return [endpoint];
  });
}

const getCachedGpuOffers = unstable_cache(
  async () =>
    assertResearchCacheSize("homepage-research-gpu", await loadGpuOffers()),
  ["homepage-research-gpu"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["pricing", "research-gpu"],
  },
);

const getCachedLlmEndpoints = unstable_cache(
  async () =>
    assertResearchCacheSize("homepage-research-llm", await loadLlmEndpoints()),
  ["homepage-research-llm"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["models", "research-llm"],
  },
);

async function getGpuOffers(): Promise<ResearchGpuOffer[]> {
  return readWithResearchCacheFallback(
    "GPU",
    getCachedGpuOffers,
    loadGpuOffers,
  );
}

async function getLlmEndpoints(): Promise<ResearchLlmEndpoint[]> {
  return readWithResearchCacheFallback(
    "LLM",
    getCachedLlmEndpoints,
    loadLlmEndpoints,
  );
}

const getCachedResearchTotals = unstable_cache(
  async (): Promise<ResearchTotals> => {
    const [gpuCountResult, llmCountResult, gpuProvidersResult, llmProvidersResult] =
      await Promise.all([
        db.select({ count: count() }).from(gpuPricing),
        db.select({ count: count() }).from(aiModels),
        db.selectDistinct({ provider: gpuPricing.provider }).from(gpuPricing),
        db.selectDistinct({ provider: aiModels.provider }).from(aiModels),
      ]);
    const providers = new Set([
      ...gpuProvidersResult.map((row) => row.provider),
      ...llmProvidersResult.map((row) => row.provider),
    ]);

    return {
      providers: providers.size,
      gpuRows: Number(gpuCountResult[0]?.count ?? 0),
      llmRows: Number(llmCountResult[0]?.count ?? 0),
    };
  },
  ["homepage-research-totals"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["pricing", "models", "research-stats"],
  },
);

const getCachedResearchFreshness = unstable_cache(
  async (): Promise<ResearchFreshness> => {
    const [gpuResult, llmResult] = await Promise.all([
      db.select({ updatedAt: max(gpuPricing.observedAt) }).from(gpuPricing),
      db.select({ updatedAt: max(aiModels.scrapedAt) }).from(aiModels),
    ]);

    return {
      gpuUpdatedAt: toIsoTimestamp(gpuResult[0]?.updatedAt),
      llmUpdatedAt: toIsoTimestamp(llmResult[0]?.updatedAt),
    };
  },
  ["homepage-research-freshness"],
  {
    revalidate: STANDARD_CACHE_TTL,
    tags: ["pricing", "models", "research-stats"],
  },
);

function toGpuChartOffer(offer: ResearchGpuOffer): GpuChartOffer {
  return {
    stableKey: offer.stableKey,
    provider: offer.provider,
    model: offer.model,
    priceHourly: offer.priceHourly,
    gpuCount: offer.gpuCount,
    pricePerGpu: offer.pricePerGpu,
  };
}

function toLlmChartEndpoint(endpoint: ResearchLlmEndpoint): LlmChartEndpoint {
  return {
    id: endpoint.id,
    permaslug: endpoint.permaslug,
    provider: endpoint.provider,
    model: endpoint.model,
    author: endpoint.author,
    completionPricePerMillion: endpoint.completionPricePerMillion,
    throughput: endpoint.throughput,
    priceObservedAt: endpoint.priceObservedAt,
    throughputObservedAt: endpoint.throughputObservedAt,
  };
}

function buildGpuPayload(
  offers: ResearchGpuOffer[],
  model: string,
): GpuChartPayload | null {
  if (!model || !offers.some((offer) => offer.model === model)) return null;
  return {
    model,
    offers: selectLowestGpuOffersByProvider(offers, model).map(toGpuChartOffer),
    resultsHref: `/gpus?${new URLSearchParams({ gpu_model: model }).toString()}`,
  };
}

function buildLlmOptions(endpoints: ResearchLlmEndpoint[]): ResearchOption[] {
  const groups = new Map<string, { label: string; providers: Set<string> }>();
  for (const endpoint of endpoints) {
    const group = groups.get(endpoint.permaslug) ?? {
      label: endpoint.model,
      providers: new Set<string>(),
    };
    group.providers.add(endpoint.provider);
    groups.set(endpoint.permaslug, group);
  }

  return [
    { value: FEATURED_MODELS, label: "Featured" },
    ...[...groups]
      .sort(
        (left, right) =>
          right[1].providers.size - left[1].providers.size ||
          left[1].label.localeCompare(right[1].label),
      )
      .map(([value, group]) => ({
        value,
        label: `${group.label} · ${group.providers.size} providers`,
      })),
  ];
}

function buildLlmPayload(
  endpoints: ResearchLlmEndpoint[],
  selection: string,
): LlmChartPayload | null {
  const isMultiModelView = selection === FEATURED_MODELS;
  const selected = endpoints
    .filter((endpoint) =>
      isMultiModelView
        ? isFeaturedLlmEndpoint(endpoint, {
            providers: featuredLlmProviderSet,
            releasedAfter: FEATURED_RELEASE_START,
            fallbackPermaslugs: featuredLlmPermaslugSet,
          })
        : endpoint.permaslug === selection,
    )
    .sort((left, right) => (right.throughput ?? 0) - (left.throughput ?? 0));

  if (!selected.length) return null;
  const modelLabel = selected[0]?.model;

  return {
    selection,
    isMultiModelView,
    endpoints: selected.map(toLlmChartEndpoint),
    resultsHref: isMultiModelView
      ? featuredLlmHref
      : modelLabel
        ? `/llms?name=${encodeURIComponent(modelLabel)}`
        : "/llms?sort=throughput.desc",
  };
}

export async function getResearchTotals(): Promise<ResearchTotals | null> {
  try {
    return await getCachedResearchTotals();
  } catch (error) {
    logger.error("[Research] Failed to load homepage totals", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getResearchFreshness(): Promise<ResearchFreshness> {
  try {
    return await getCachedResearchFreshness();
  } catch (error) {
    logger.error("[Research] Failed to load dataset freshness", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { gpuUpdatedAt: null, llmUpdatedAt: null };
  }
}

export async function getGpuChartPayload(
  model: string,
): Promise<GpuChartPayload | null> {
  const offers = await getGpuOffers();
  return buildGpuPayload(offers, model);
}

export async function getLlmChartPayload(
  selection: string,
): Promise<LlmChartPayload | null> {
  const endpoints = await getLlmEndpoints();
  return buildLlmPayload(endpoints, selection);
}

export async function getHomepageResearchManifest(): Promise<HomepageResearchManifest> {
  const [gpuResult, llmResult] = await Promise.all([
    getGpuOffers().catch((error) => {
      logger.error("[Research] Failed to load GPU chart data", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [] as ResearchGpuOffer[];
    }),
    getLlmEndpoints().catch((error) => {
      logger.error("[Research] Failed to load LLM chart data", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [] as ResearchLlmEndpoint[];
    }),
  ]);
  const gpuOptions = rankGpuModels(gpuResult).map((value) => ({
    value,
    label: value,
  }));
  const defaultGpuModel = pickDefaultGpuModel(gpuResult);
  const initialGpu = buildGpuPayload(gpuResult, defaultGpuModel) ?? {
    model: "",
    offers: [],
    resultsHref: "/gpus",
  };
  const initialLlm = buildLlmPayload(llmResult, FEATURED_MODELS) ?? {
    selection: FEATURED_MODELS,
    isMultiModelView: true,
    endpoints: [],
    resultsHref: featuredLlmHref,
  };

  return createHomepageResearchManifest(
    { options: gpuOptions, initial: initialGpu },
    { options: buildLlmOptions(llmResult), initial: initialLlm },
  );
}
