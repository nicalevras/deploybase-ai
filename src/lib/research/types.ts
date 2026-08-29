export interface ResearchGpuOffer {
  stableKey: string;
  provider: string;
  model: string;
  type: string;
  priceHourly: number;
  gpuCount: number;
  pricePerGpu: number;
  observedAt: string;
}

export interface ResearchLlmEndpoint {
  id: string;
  permaslug: string;
  endpointId: string;
  provider: string;
  model: string;
  author: string;
  hasTextOutput: boolean;
  outputModalities: string[];
  releasedAt: string | null;
  completionPricePerMillion: number | null;
  promptPricePerMillion: number | null;
  throughput: number | null;
  latencyMs: number | null;
  observedAt: string | null;
  priceObservedAt: string;
  throughputObservedAt: string | null;
}

export type GpuChartOffer = Pick<
  ResearchGpuOffer,
  | "stableKey"
  | "provider"
  | "model"
  | "priceHourly"
  | "gpuCount"
  | "pricePerGpu"
>;

export type LlmChartEndpoint = Pick<
  ResearchLlmEndpoint,
  | "id"
  | "permaslug"
  | "provider"
  | "model"
  | "author"
  | "completionPricePerMillion"
  | "throughput"
  | "priceObservedAt"
  | "throughputObservedAt"
>;

export interface ResearchOption {
  value: string;
  label: string;
}

export interface ResearchTotals {
  providers: number;
  gpuRows: number;
  llmRows: number;
}

export interface ResearchFreshness {
  gpuUpdatedAt: string | null;
  llmUpdatedAt: string | null;
}

export interface GpuChartPayload {
  model: string;
  offers: GpuChartOffer[];
}

export interface LlmChartPayload {
  selection: string;
  isMultiModelView: boolean;
  endpoints: LlmChartEndpoint[];
}

export interface HomepageResearchManifest {
  gpu: {
    options: ResearchOption[];
    initial: GpuChartPayload;
  };
  llm: {
    options: ResearchOption[];
    initial: LlmChartPayload;
  };
}
