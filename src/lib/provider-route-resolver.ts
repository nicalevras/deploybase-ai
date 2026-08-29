import "server-only";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { modelsCache } from "@/lib/models-cache";
import {
  resolveProviderFromValues,
  type ProviderRouteResolution,
} from "@/lib/provider-route";
import { cache } from "react";

export const resolveGpuProviderRoute = cache(
  async (segment: string): Promise<ProviderRouteResolution | null> => {
    const facets = await gpuPricingCache.getGpusFacets();
    const providers =
      facets.provider?.rows.map((row) => String(row.value)) ?? [];
    return resolveProviderFromValues(segment, providers, "gpu");
  },
);

export const resolveLlmProviderRoute = cache(
  async (segment: string): Promise<ProviderRouteResolution | null> => {
    const providers = await modelsCache.getAvailableProviders();
    return resolveProviderFromValues(segment, providers, "llm");
  },
);
