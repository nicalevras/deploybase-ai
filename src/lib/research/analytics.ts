import type {
  ResearchGpuOffer,
  ResearchLlmEndpoint,
} from "@/lib/research/types";

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export interface GpuMarketHistorySample {
  provider: string;
  observedAt: Date | string;
  priceUsd: number;
  gpuCount: number;
}

export interface GpuMarketHistoryPoint {
  observedAt: string;
  pricePerGpu: number;
  providerCount: number;
}

export function buildGpuMarketHistorySeries(
  samples: GpuMarketHistorySample[],
): GpuMarketHistoryPoint[] {
  const dailyProviderPrices = new Map<string, Map<string, number>>();

  for (const sample of samples) {
    const observedAt = new Date(sample.observedAt);
    const provider = sample.provider.trim().toLowerCase();
    if (
      !provider ||
      Number.isNaN(observedAt.getTime()) ||
      !Number.isFinite(sample.priceUsd) ||
      sample.priceUsd <= 0 ||
      !Number.isFinite(sample.gpuCount) ||
      sample.gpuCount <= 0
    ) {
      continue;
    }

    const day = new Date(
      Date.UTC(
        observedAt.getUTCFullYear(),
        observedAt.getUTCMonth(),
        observedAt.getUTCDate(),
      ),
    ).toISOString();
    const pricePerGpu = sample.priceUsd / sample.gpuCount;
    const providerPrices =
      dailyProviderPrices.get(day) ?? new Map<string, number>();
    const current = providerPrices.get(provider);

    if (current === undefined || pricePerGpu < current) {
      providerPrices.set(provider, pricePerGpu);
    }
    dailyProviderPrices.set(day, providerPrices);
  }

  return [...dailyProviderPrices]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([observedAt, providerPrices]) => {
      const average =
        [...providerPrices.values()].reduce((sum, price) => sum + price, 0) /
        providerPrices.size;

      return {
        observedAt,
        pricePerGpu: Number(average.toFixed(6)),
        providerCount: providerPrices.size,
      };
    });
}

export function rankGpuModels(offers: ResearchGpuOffer[]): string[] {
  const coverage = new Map<string, Set<string>>();
  for (const offer of offers) {
    const providers = coverage.get(offer.model) ?? new Set<string>();
    providers.add(offer.provider);
    coverage.set(offer.model, providers);
  }
  return [...coverage]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .map(([model]) => model);
}

export function pickDefaultGpuModel(offers: ResearchGpuOffer[]): string {
  const models = rankGpuModels(offers);
  return (
    models.find((model) => model.toLowerCase() === "nvidia h100") ??
    models[0] ??
    ""
  );
}

export function selectLowestGpuOffersByProvider(
  offers: ResearchGpuOffer[],
  model: string,
): ResearchGpuOffer[] {
  const offersByProvider = new Map<string, ResearchGpuOffer[]>();

  for (const offer of offers) {
    if (offer.model !== model) continue;
    const providerOffers = offersByProvider.get(offer.provider) ?? [];
    providerOffers.push(offer);
    offersByProvider.set(offer.provider, providerOffers);
  }

  const selectedOffers = [...offersByProvider.values()].map(
    (providerOffers) => {
      const singleGpuOffers = providerOffers.filter(
        (offer) => offer.gpuCount === 1,
      );
      const eligibleOffers = singleGpuOffers.length
        ? singleGpuOffers
        : providerOffers;

      return eligibleOffers.reduce((lowest, offer) =>
        offer.pricePerGpu < lowest.pricePerGpu ? offer : lowest,
      );
    },
  );

  return selectedOffers.sort(
    (left, right) => left.pricePerGpu - right.pricePerGpu,
  );
}

export function isFeaturedLlmEndpoint(
  endpoint: ResearchLlmEndpoint,
  options: {
    providers: ReadonlySet<string>;
    releasedAfter: number;
    fallbackPermaslugs: ReadonlySet<string>;
  },
): boolean {
  if (
    !hasComparableTextOutput(endpoint) ||
    !options.providers.has(endpoint.provider)
  ) {
    return false;
  }

  if (endpoint.releasedAt) {
    const releasedAt = Date.parse(endpoint.releasedAt);
    return Number.isFinite(releasedAt) && releasedAt >= options.releasedAfter;
  }

  return options.fallbackPermaslugs.has(endpoint.permaslug);
}

const NON_TEXT_OUTPUT_MODALITIES = new Set([
  "image",
  "audio",
  "video",
  "speech",
  "transcription",
]);

export function hasComparableTextOutput(endpoint: ResearchLlmEndpoint) {
  return (
    endpoint.hasTextOutput &&
    !endpoint.outputModalities.some((modality) =>
      NON_TEXT_OUTPUT_MODALITIES.has(modality.toLowerCase()),
    )
  );
}

export function rankLlmModelsForComparison(
  endpoints: ResearchLlmEndpoint[],
): string[] {
  const groups = new Map<
    string,
    { providers: Set<string>; measured: number }
  >();
  for (const endpoint of endpoints) {
    if (endpoint.throughput === null && endpoint.latencyMs === null) continue;
    const group = groups.get(endpoint.permaslug) ?? {
      providers: new Set<string>(),
      measured: 0,
    };
    group.providers.add(endpoint.provider);
    group.measured += 1;
    groups.set(endpoint.permaslug, group);
  }
  return [...groups]
    .filter(([, group]) => group.providers.size >= 2)
    .sort(
      (a, b) =>
        b[1].providers.size - a[1].providers.size ||
        b[1].measured - a[1].measured ||
        a[0].localeCompare(b[0]),
    )
    .map(([permaslug]) => permaslug);
}

export function pickDefaultLlmModel(endpoints: ResearchLlmEndpoint[]): string {
  return rankLlmModelsForComparison(endpoints)[0] ?? "";
}

export function buildGpuOffer(input: {
  stableKey: string;
  provider: string;
  observedAt: Date | string;
  data: unknown;
}): ResearchGpuOffer | null {
  if (!input.data || typeof input.data !== "object") return null;
  const data = input.data as Record<string, unknown>;
  const modelValue = data.gpu_model ?? data.item ?? data.sku;
  const model = typeof modelValue === "string" ? modelValue.trim() : "";
  const price = toFiniteNumber(data.price_hour_usd ?? data.price_usd);
  const parsedGpuCount = toFiniteNumber(data.gpu_count);
  const gpuCount = parsedGpuCount && parsedGpuCount > 0 ? parsedGpuCount : 1;

  if (!model || price === null || price <= 0) return null;

  return {
    stableKey: input.stableKey,
    provider: input.provider,
    model,
    type:
      typeof data.type === "string" && data.type.trim()
        ? data.type.trim()
        : "All types",
    priceHourly: price,
    gpuCount,
    pricePerGpu: price / gpuCount,
    observedAt: new Date(input.observedAt).toISOString(),
  };
}

export function buildLlmEndpoint(input: {
  id: string;
  permaslug: string | null;
  endpointId: string | null;
  provider: string;
  shortName: string | null;
  name: string | null;
  author: string | null;
  hasTextOutput?: string | null;
  outputModalities?: string[] | null;
  releasedAt?: Date | string | null;
  completionPrice: number | null;
  promptPrice: number | null;
  throughput: number | null;
  scrapedAt: Date | string;
  throughputObservedAt?: Date | string | null;
  latencyMs?: number | null;
  latencyObservedAt?: Date | string | null;
}): ResearchLlmEndpoint | null {
  const permaslug = input.permaslug?.trim();
  const endpointId = input.endpointId?.trim();
  const model = input.shortName?.trim() || input.name?.trim();
  if (!permaslug || !endpointId || !model) return null;

  const perMillion = (value: number | null) =>
    value !== null && Number.isFinite(value) && value >= 0
      ? value * 1_000_000
      : null;

  return {
    id: input.id,
    permaslug,
    endpointId,
    provider: input.provider,
    model,
    author: input.author?.trim() || "Unknown",
    hasTextOutput: input.hasTextOutput === "true",
    outputModalities: input.outputModalities ?? [],
    releasedAt: toIsoDate(input.releasedAt),
    completionPricePerMillion: perMillion(input.completionPrice),
    promptPricePerMillion: perMillion(input.promptPrice),
    throughput:
      input.throughput !== null &&
      Number.isFinite(input.throughput) &&
      input.throughput > 0
        ? input.throughput
        : null,
    latencyMs:
      input.latencyMs !== null &&
      input.latencyMs !== undefined &&
      Number.isFinite(input.latencyMs) &&
      input.latencyMs > 0
        ? input.latencyMs
        : null,
    observedAt: input.latencyObservedAt
      ? new Date(input.latencyObservedAt).toISOString()
      : new Date(input.scrapedAt).toISOString(),
    priceObservedAt: new Date(input.scrapedAt).toISOString(),
    throughputObservedAt: toIsoDate(input.throughputObservedAt),
  };
}
