import type { InfiniteQueryResponse, LogsMeta } from "./query-options";
import type { ColumnSchema } from "./schema";
import { getGpuPricingPage } from "@/lib/gpu-pricing-loader";
import { newestIsoTimestamp } from "@/lib/research/freshness";

export function buildGpuSchema(
  payload: Awaited<ReturnType<typeof getGpuPricingPage>> | null,
  feedName?: string,
  feedDescription?: string,
): Record<string, unknown> | null {
  if (!payload || !payload.data?.length) {
    return null;
  }

  const pricedRows = payload.data.filter(
    (row) =>
      typeof row.price_hour_usd === "number" &&
      !Number.isNaN(row.price_hour_usd),
  );

  if (!pricedRows.length) {
    return null;
  }

  const items = pricedRows.slice(0, 50).map((row) => {
    const providerName = formatProviderName(row.provider);
    const gpuModel = row.gpu_model?.trim() || null;
    const gpuCount =
      typeof row.gpu_count === "number" && row.gpu_count > 0
        ? row.gpu_count
        : null;
    const instanceType = row.type ?? "VM";
    const additionalProperty: Array<{
      "@type": "PropertyValue";
      name: string;
      value: string | number;
    }> = [];

    pushProperty(additionalProperty, "GPU Model", gpuModel);
    pushProperty(additionalProperty, "GPU Count", gpuCount);
    pushProperty(additionalProperty, "VRAM (GB)", row.vram_gb);
    pushProperty(additionalProperty, "vCPUs", row.vcpus);
    pushProperty(additionalProperty, "System RAM (GB)", row.system_ram_gb);
    pushProperty(additionalProperty, "Instance Type", instanceType);

    const normalizedSku = normalizeSku(row.stable_key ?? row.sku ?? null);

    const productItem: Record<string, unknown> = {
      "@type": "Product",
      name: buildGpuProductName(providerName, gpuCount, gpuModel, instanceType),
      brand: {
        "@type": "Organization",
        name: providerName,
      },
      category: "GPU Cloud Instance",
      url:
        row.uuid && process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/gpus?uuid=${encodeURIComponent(
              row.uuid,
            )}`
          : undefined,
      image: "/assets/data-table-infinite.png",
      sku: normalizedSku ?? undefined,
      description: buildGpuDescription({
        providerName,
        gpuModel,
        gpuCount,
        instanceType,
        vram: row.vram_gb,
        vcpus: row.vcpus,
        systemRam: row.system_ram_gb,
      }),
      additionalProperty,
    };

    productItem.offers = {
      "@type": "Offer",
      priceCurrency: "USD",
      price: row.price_hour_usd,
      availabilityStarts: row.observed_at,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: row.price_hour_usd,
        priceCurrency: "USD",
        unitCode: "HUR",
      },
    };
    pushProperty(additionalProperty, "Stable Key", row.stable_key);

    return {
      "@type": "DataFeedItem",
      dateCreated: row.observed_at,
      item: productItem,
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "DataFeed",
    name: feedName ?? "GPU Pricing Feed",
    description: feedDescription ?? "Real-time GPU cloud pricing across providers.",
    dateModified:
      newestIsoTimestamp(pricedRows.map((row) => row.observed_at)) ?? undefined,
    dataFeedElement: items,
  };
}

function pushProperty(
  list: Array<{ "@type": "PropertyValue"; name: string; value: string | number }>,
  name: string,
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return;
  }
  list.push({
    "@type": "PropertyValue",
    name,
    value: typeof value === "string" ? value : Number(value),
  });
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  coreweave: "CoreWeave",
  openai: "OpenAI",
  runpod: "RunPod",
  lambda: "Lambda",
  hyperstack: "Hyperstack",
  nebius: "Nebius",
  vast: "Vast.ai",
  crusoe: "Crusoe",
  latitude: "Latitude",
  oblivus: "Oblivus",
  sesterce: "Sesterce",
  thundercompute: "ThunderCompute",
  paperspace: "Paperspace",
  fluidstack: "FluidStack",
  tensordock: "TensorDock",
  datacrunch: "DataCrunch",
  vultr: "Vultr",
  ovhcloud: "OVHcloud",
  scaleway: "Scaleway",
  massedcompute: "Massed Compute",
  jarvis: "Jarvis Labs",
  aws: "AWS",
  gcp: "Google Cloud",
  googlecloud: "Google Cloud",
  azure: "Microsoft Azure",
  digitalocean: "DigitalOcean",
  flyio: "Fly.io",
  hotaisle: "Hot Aisle",
  alibaba: "Alibaba Cloud",
  oracle: "Oracle Cloud",
};

function formatProviderName(provider?: string | null) {
  if (!provider) return "Unknown Provider";
  return PROVIDER_DISPLAY_NAMES[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function buildGpuProductName(
  provider: string,
  gpuCount: number | null,
  gpuModel: string | null,
  instanceType: string,
) {
  const countLabel = gpuCount ?? 1;
  const modelLabel = gpuModel ?? "GPU";
  return `${provider} – ${countLabel}× ${modelLabel} (${instanceType})`;
}

function buildGpuDescription({
  providerName,
  gpuModel,
  gpuCount,
  instanceType,
  vram,
  vcpus,
  systemRam,
}: {
  providerName: string;
  gpuModel: string | null;
  gpuCount: number | null;
  instanceType: string;
  vram?: number | null;
  vcpus?: number | string | null;
  systemRam?: number | null;
}) {
  const parts: string[] = [];
  const countLabel = gpuCount ?? 1;
  const modelLabel = gpuModel ?? "GPU";
  parts.push(
    `${countLabel}× ${modelLabel} ${instanceType.toLowerCase()} from ${providerName}`,
  );
  if (typeof vram === "number") {
    parts.push(`${vram} GB VRAM`);
  }
  if (vcpus !== null && vcpus !== undefined && vcpus !== "") {
    parts.push(`${vcpus} vCPUs`);
  }
  if (typeof systemRam === "number") {
    parts.push(`${systemRam} GB system RAM`);
  }
  parts.push("billed hourly.");
  return parts.join(", ");
}

function normalizeSku(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "-");
}
