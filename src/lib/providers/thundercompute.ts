import { createHash } from "node:crypto";
import type { ProviderResult, ThundercomputePriceRow } from "@/types/pricing";
import { z } from "zod";
import type { ProviderScraper } from "./types";

const API_URL = "https://api.thundercompute.com:8443/v2";
const PRICING_URL = "https://www.thundercompute.com/pricing";

const positiveInteger = z.number().int().positive();
const pricingSchema = z.object({
  pricing: z.record(z.number().finite().nonnegative()),
});
const specsSchema = z.object({
  specs: z.record(
    z.object({
      displayName: z.string().trim().min(1),
      gpuCount: positiveInteger,
      vramGB: positiveInteger,
      vcpuOptions: z.array(positiveInteger).nonempty(),
      ramPerVCPUGiB: positiveInteger,
      ramCapGiB: z.number().int().nonnegative().optional(),
      storageGB: z.object({ min: positiveInteger, max: positiveInteger }),
    }),
  ),
});
const statusSchema = z.object({ specs: z.record(z.string()) });

// v2 contract: https://www.thundercompute.com/docs/api-reference/utilities/get-v2-gpu-specifications
export function parseThundercomputeRows(
  pricingPayload: unknown,
  specsPayload: unknown,
  statusPayload: unknown,
  observedAt: string,
): ThundercomputePriceRow[] {
  const { pricing } = pricingSchema.parse(pricingPayload);
  const { specs } = specsSchema.parse(specsPayload);
  const { specs: availability } = statusSchema.parse(statusPayload);
  if (!Object.keys(specs).length)
    throw new Error("Thunder Compute returned no specifications");

  const rows: ThundercomputePriceRow[] = [];
  for (const [key, spec] of Object.entries(specs)) {
    // Per-spec v2 status is authoritative; the legacy gpu_type map can disagree.
    const status = availability[key];
    if (!status)
      throw new Error(`Missing Thunder Compute availability for ${key}`);
    if (status !== "available") continue;

    const price = pricing[key];
    if (price === undefined || price <= 0) {
      throw new Error(`Missing or invalid Thunder Compute price for ${key}`);
    }

    // Thunder's pricing calculator includes the lowest vCPU option in the base price.
    // Publish that configuration without optional CPU or storage upgrades.
    const vcpus = Math.min(...spec.vcpuOptions);
    const maxVcpus = Math.max(...spec.vcpuOptions);
    const ram = spec.ramCapGiB
      ? spec.ramCapGiB - (maxVcpus - vcpus) * spec.ramPerVCPUGiB
      : vcpus * spec.ramPerVCPUGiB;
    if (ram <= 0 || spec.storageGB.min > spec.storageGB.max) {
      throw new Error(`Invalid Thunder Compute configuration for ${key}`);
    }

    let gpuModel = spec.displayName.replace(/\s*\(\d+\s*GB\)/gi, "").trim();
    if (!/^(NVIDIA|AMD)\b/i.test(gpuModel)) gpuModel = `NVIDIA ${gpuModel}`;
    // Thunder's pricing page identifies its H100 offering as PCIe.
    if (gpuModel === "NVIDIA H100") gpuModel = "NVIDIA H100 PCIe";

    rows.push({
      provider: "thundercompute",
      source_url: PRICING_URL,
      observed_at: observedAt,
      instance_id: key,
      sku: key,
      gpu_model: gpuModel,
      gpu_count: spec.gpuCount,
      vram_gb: spec.vramGB * spec.gpuCount,
      vcpus,
      system_ram_gb: ram,
      storage_gb: spec.storageGB.min,
      price_unit: "instance_hour",
      price_hour_usd: price,
      raw_cost: `$${price.toFixed(2)}/hr`,
      availability: "available",
      class: "GPU",
      type: "Virtual Machine",
    });
  }
  if (!rows.length)
    throw new Error("Thunder Compute returned no available GPU configurations");
  return rows;
}

class ThundercomputeScraper implements ProviderScraper {
  name = "thundercompute";
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    const [pricing, specs, status] = await Promise.all(
      ["pricing", "specs", "status"].map(async (endpoint) => {
        const response = await fetch(`${API_URL}/${endpoint}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          throw new Error(
            `Thunder Compute ${endpoint} request failed: ${response.status}`,
          );
        }
        return response.json() as Promise<unknown>;
      }),
    );
    const observedAt = new Date().toISOString();
    return {
      provider: "thundercompute",
      rows: parseThundercomputeRows(pricing, specs, status, observedAt),
      observedAt,
      sourceHash: createHash("sha256")
        .update(JSON.stringify({ pricing, specs, status }))
        .digest("hex"),
    };
  }
}

export const thundercomputeScraper = new ThundercomputeScraper();
