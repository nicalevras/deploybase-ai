import { getModelsPage } from "@/lib/models-loader";
import { newestIsoTimestamp } from "@/lib/research/freshness";

export function buildModelsSchema(
  payload: Awaited<ReturnType<typeof getModelsPage>> | null,
  feedName?: string,
  feedDescription?: string,
): Record<string, unknown> | null {
  if (!payload || !payload.data?.length) {
    return null;
  }

  const items = payload.data.slice(0, 50).map((model) => {
    const inputPricePerMillion = parsePricePerMillion(model.promptPrice);
    const outputPricePerMillion = parsePricePerMillion(
      model.completionPrice,
    );

    const additionalProperty: Array<{
      "@type": "PropertyValue";
      name: string;
      value: string | number;
    }> = [];

    if (typeof model.contextLength === "number") {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Context Length",
        value: model.contextLength,
      });
    }

    if (model.slug) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Model ID",
        value: model.slug,
      });
    }

    if (model.inputModalities && model.inputModalities.length > 0) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Input Modalities",
        value: model.inputModalities.join(", "),
      });
    }

    if (model.outputModalities && model.outputModalities.length > 0) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Output Modalities",
        value: model.outputModalities.join(", "),
      });
    }

    if (inputPricePerMillion !== null) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Input Price (USD / 1M tokens)",
        value: inputPricePerMillion,
      });
    }

    if (outputPricePerMillion !== null) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Output Price (USD / 1M tokens)",
        value: outputPricePerMillion,
      });
    }

    if (typeof model.throughput === "number") {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Throughput (tok/s)",
        value: Number(model.throughput.toFixed(2)),
      });
    }

    return {
      "@type": "DataFeedItem",
      dateModified: model.scrapedAt,
      item: {
        "@type": "SoftwareApplication",
        name: model.name ?? model.shortName ?? model.slug,
        applicationCategory: "AI language model",
        operatingSystem: "Cloud",
        description: model.description,
        provider: model.provider
          ? {
              "@type": "Organization",
              name: model.provider,
            }
          : undefined,
        author: model.author
          ? {
              "@type": "Organization",
              name: model.author,
            }
          : undefined,
        softwareVersion: model.modelVersionGroupId ?? undefined,
        additionalProperty: additionalProperty.length
          ? additionalProperty
          : undefined,
        url:
          model.id && process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/llms?uuid=${normalizeModelId(
                model.id,
              )}`
            : undefined,
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "DataFeed",
    name: feedName ?? "LLM Inference Pricing Feed",
    description: feedDescription ?? "LLM API pricing across providers.",
    dateModified:
      newestIsoTimestamp(payload.data.map((model) => model.scrapedAt)) ??
      undefined,
    dataFeedElement: items,
  };
}

function parsePricePerMillion(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Number((value * 1_000_000).toFixed(6))
      : null;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? Number((numeric * 1_000_000).toFixed(6))
      : null;
  }
  return null;
}

function normalizeModelId(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "/");
}
