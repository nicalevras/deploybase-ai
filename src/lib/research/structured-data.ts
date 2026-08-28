const DEFAULT_SITE_URL = "https://deploybase.ai";

type JsonLdNode = Record<string, unknown>;

function withoutContext(node: JsonLdNode): JsonLdNode {
  const { "@context": _context, ...rest } = node;
  return rest;
}

function organization(siteUrl: string) {
  return {
    "@type": "Organization",
    name: "Deploybase",
    url: siteUrl,
  };
}

export function combineStructuredData(
  ...nodes: Array<JsonLdNode | null | undefined>
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean).map((node) => withoutContext(node!)),
  };
}

export function buildHomepageStructuredData({
  title,
  description,
  siteUrl = DEFAULT_SITE_URL,
}: {
  title: string;
  description: string;
  siteUrl?: string;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Deploybase",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          url: `${siteUrl}/assets/icon-512x512.png`,
          contentUrl: `${siteUrl}/assets/icon-512x512.png`,
          width: 512,
          height: 512,
          caption: "Deploybase",
        },
        sameAs: [
          "https://github.com/nicalevras/deploybase-ai",
          "https://x.com/deploybase",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Deploybase",
        alternateName: "deploybase.ai",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: title,
        description,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/assets/og-image.png`,
        },
        inLanguage: "en-US",
      },
    ],
  };
}

export function buildGpuDatasetStructuredData(
  dateModified: string | null,
  siteUrl = DEFAULT_SITE_URL,
): JsonLdNode {
  return {
    "@type": "Dataset",
    "@id": `${siteUrl}/gpus#dataset`,
    name: "GPU Cloud Pricing Dataset",
    description:
      "Hourly GPU cloud pricing by provider, model, configuration, and hardware specification.",
    url: `${siteUrl}/gpus`,
    creator: organization(siteUrl),
    publisher: organization(siteUrl),
    license: `${siteUrl}/terms`,
    isAccessibleForFree: true,
    dateModified: dateModified ?? undefined,
    inLanguage: "en-US",
    keywords: [
      "GPU pricing",
      "cloud GPU",
      "GPU cloud providers",
      "GPU instances",
    ],
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Hourly price",
        unitText: "USD per hour",
      },
      { "@type": "PropertyValue", name: "GPU count" },
      { "@type": "PropertyValue", name: "GPU memory", unitText: "GB" },
      { "@type": "PropertyValue", name: "vCPU count" },
      { "@type": "PropertyValue", name: "System memory", unitText: "GB" },
    ],
  };
}

export function buildLlmDatasetStructuredData(
  dateModified: string | null,
  siteUrl = DEFAULT_SITE_URL,
): JsonLdNode {
  return {
    "@type": "Dataset",
    "@id": `${siteUrl}/llms#dataset`,
    name: "LLM Inference Pricing and Performance Dataset",
    description:
      "LLM inference endpoint pricing and observed performance by model and provider.",
    url: `${siteUrl}/llms`,
    creator: organization(siteUrl),
    publisher: organization(siteUrl),
    license: `${siteUrl}/terms`,
    isAccessibleForFree: true,
    dateModified: dateModified ?? undefined,
    inLanguage: "en-US",
    keywords: [
      "LLM pricing",
      "LLM inference",
      "token pricing",
      "LLM performance",
      "inference providers",
    ],
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Input token price",
        unitText: "USD per million tokens",
      },
      {
        "@type": "PropertyValue",
        name: "Output token price",
        unitText: "USD per million tokens",
      },
      {
        "@type": "PropertyValue",
        name: "Output throughput",
        unitText: "tokens per second",
      },
      {
        "@type": "PropertyValue",
        name: "Context length",
        unitText: "tokens",
      },
    ],
  };
}
