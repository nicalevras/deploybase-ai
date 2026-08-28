import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGpuMarketHistorySeries,
  buildGpuOffer,
  buildLlmEndpoint,
  isFeaturedLlmEndpoint,
  median,
  pickDefaultGpuModel,
  pickDefaultLlmModel,
  rankGpuModels,
  rankLlmModelsForComparison,
  selectLowestGpuOffersByProvider,
} from "./analytics.ts";
import type { ResearchGpuOffer, ResearchLlmEndpoint } from "./types.ts";

function gpuOffer(model: string, provider: string): ResearchGpuOffer {
  return {
    stableKey: `${provider}:${model}`,
    provider,
    model,
    type: "Cloud GPU",
    priceHourly: 2,
    gpuCount: 1,
    pricePerGpu: 2,
    observedAt: "2026-08-24T12:00:00.000Z",
  };
}

function llmEndpoint(
  overrides: Partial<ResearchLlmEndpoint> = {},
): ResearchLlmEndpoint {
  const base: ResearchLlmEndpoint = {
    id: "openrouter:endpoint-1",
    permaslug: "author/model",
    endpointId: "endpoint-1",
    provider: "Provider A",
    model: "Model",
    author: "Author",
    hasTextOutput: true,
    outputModalities: ["Text"],
    releasedAt: "2026-07-01T00:00:00.000Z",
    completionPricePerMillion: 2,
    promptPricePerMillion: 1,
    throughput: 100,
    latencyMs: 200,
    observedAt: "2026-08-24T12:00:00.000Z",
    priceObservedAt: "2026-08-24T12:00:00.000Z",
    throughputObservedAt: "2026-08-24T12:00:00.000Z",
  };
  return {
    ...base,
    ...overrides,
    hasTextOutput: overrides.hasTextOutput ?? base.hasTextOutput,
    outputModalities: overrides.outputModalities ?? base.outputModalities,
    releasedAt:
      overrides.releasedAt === undefined
        ? base.releasedAt
        : overrides.releasedAt,
    priceObservedAt: overrides.priceObservedAt ?? base.priceObservedAt,
    throughputObservedAt:
      overrides.throughputObservedAt === undefined
        ? base.throughputObservedAt
        : overrides.throughputObservedAt,
  };
}

describe("research analytics", () => {
  it("calculates median values while excluding invalid inputs", () => {
    assert.equal(median([9, 1, 5]), 5);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(median([Number.NaN]), null);
  });

  it("normalizes a multi-GPU offer to its listed per-GPU hourly price", () => {
    const offer = buildGpuOffer({
      stableKey: "provider:h100x8",
      provider: "Provider",
      observedAt: "2026-08-24T12:00:00.000Z",
      data: {
        gpu_model: "NVIDIA H100",
        price_hour_usd: "47.60",
        gpu_count: 8,
        type: "Cloud GPU",
      },
    });
    assert.equal(offer?.priceHourly, 47.6);
    assert.equal(offer?.gpuCount, 8);
    assert.equal(offer?.pricePerGpu, 5.95);
  });

  it("prefers single-GPU offers and falls back to normalized multi-GPU offers", () => {
    const offers: ResearchGpuOffer[] = [
      {
        ...gpuOffer("NVIDIA H100", "Provider A"),
        stableKey: "a:single",
        type: "Cloud GPU",
        priceHourly: 6,
        gpuCount: 1,
        pricePerGpu: 6,
      },
      {
        ...gpuOffer("NVIDIA H100", "Provider A"),
        stableKey: "a:cluster",
        type: "Bare Metal",
        priceHourly: 16,
        gpuCount: 4,
        pricePerGpu: 4,
      },
      {
        ...gpuOffer("NVIDIA H100", "Provider B"),
        stableKey: "b:cluster",
        priceHourly: 20,
        gpuCount: 4,
        pricePerGpu: 5,
      },
      gpuOffer("NVIDIA L40S", "Provider C"),
    ];

    assert.deepEqual(
      selectLowestGpuOffersByProvider(offers, "NVIDIA H100").map(
        (offer) => offer.stableKey,
      ),
      ["b:cluster", "a:single"],
    );
  });

  it("averages the cheapest normalized price from each provider", () => {
    const series = buildGpuMarketHistorySeries([
      {
        provider: "coreweave",
        observedAt: "2026-08-24T00:00:00.000Z",
        priceUsd: 16,
        gpuCount: 4,
      },
      {
        provider: "coreweave",
        observedAt: "2026-08-24T00:00:00.000Z",
        priceUsd: 20,
        gpuCount: 4,
      },
      {
        provider: "lambda",
        observedAt: "2026-08-24T00:00:00.000Z",
        priceUsd: 6,
        gpuCount: 1,
      },
    ]);

    assert.deepEqual(series, [
      {
        observedAt: "2026-08-24T00:00:00.000Z",
        pricePerGpu: 5,
        providerCount: 2,
      },
    ]);
  });

  it("rejects incomplete or non-positive GPU offers", () => {
    assert.equal(
      buildGpuOffer({
        stableKey: "a",
        provider: "A",
        observedAt: new Date(),
        data: { price_hour_usd: 1 },
      }),
      null,
    );
    assert.equal(
      buildGpuOffer({
        stableKey: "b",
        provider: "B",
        observedAt: new Date(),
        data: { gpu_model: "H100", price_hour_usd: 0 },
      }),
      null,
    );
  });

  it("normalizes valid LLM prices and filters invalid performance values", () => {
    const endpoint = buildLlmEndpoint({
      id: "id",
      permaslug: "author/model",
      endpointId: "endpoint",
      provider: "Provider",
      shortName: "Model",
      name: null,
      author: "Author",
      completionPrice: 0.000002,
      promptPrice: 0.000001,
      throughput: -1,
      latencyMs: Number.NaN,
      scrapedAt: "2026-08-24T12:00:00.000Z",
    });
    assert.equal(endpoint?.completionPricePerMillion, 2);
    assert.equal(endpoint?.promptPricePerMillion, 1);
    assert.equal(endpoint?.throughput, null);
    assert.equal(endpoint?.latencyMs, null);
    assert.equal(endpoint?.hasTextOutput, false);
    assert.equal(endpoint?.priceObservedAt, "2026-08-24T12:00:00.000Z");
  });

  it("requires stable model and endpoint identities", () => {
    assert.equal(
      buildLlmEndpoint({
        id: "id",
        permaslug: null,
        endpointId: "endpoint",
        provider: "P",
        shortName: "M",
        name: null,
        author: null,
        completionPrice: null,
        promptPrice: null,
        throughput: null,
        scrapedAt: new Date(),
      }),
      null,
    );
  });

  it("ignores malformed optional release metadata", () => {
    const endpoint = buildLlmEndpoint({
      id: "id",
      permaslug: "author/model",
      endpointId: "endpoint",
      provider: "Provider",
      shortName: "Model",
      name: null,
      author: "Author",
      releasedAt: "not-a-date",
      completionPrice: 0.000002,
      promptPrice: 0.000001,
      throughput: 100,
      scrapedAt: "2026-08-24T12:00:00.000Z",
    });

    assert.equal(endpoint?.releasedAt, null);
  });
});

describe("featured LLM filtering", () => {
  const options = {
    providers: new Set(["OpenAI"]),
    releasedAfter: Date.parse("2026-05-25T00:00:00.000Z"),
    fallbackPermaslugs: new Set(["openai/fallback"]),
  };

  it("has no end date for future text models from selected providers", () => {
    assert.equal(
      isFeaturedLlmEndpoint(
        llmEndpoint({
          provider: "OpenAI",
          releasedAt: "2027-01-01T00:00:00.000Z",
        }),
        options,
      ),
      true,
    );
  });

  it("excludes old, non-text, and unselected-provider endpoints", () => {
    assert.equal(
      isFeaturedLlmEndpoint(
        llmEndpoint({ provider: "OpenAI", releasedAt: "2026-05-01" }),
        options,
      ),
      false,
    );
    assert.equal(
      isFeaturedLlmEndpoint(
        llmEndpoint({ provider: "OpenAI", hasTextOutput: false }),
        options,
      ),
      false,
    );
    assert.equal(
      isFeaturedLlmEndpoint(llmEndpoint({ provider: "Anthropic" }), options),
      false,
    );
  });

  it("uses the curated fallback only when release metadata is absent", () => {
    assert.equal(
      isFeaturedLlmEndpoint(
        llmEndpoint({
          provider: "OpenAI",
          permaslug: "openai/fallback",
          releasedAt: null,
        }),
        options,
      ),
      true,
    );
    assert.equal(
      isFeaturedLlmEndpoint(
        llmEndpoint({
          provider: "OpenAI",
          permaslug: "openai/unknown",
          releasedAt: null,
        }),
        options,
      ),
      false,
    );
  });
});

describe("research defaults", () => {
  it("prefers NVIDIA H100 and otherwise uses widest provider coverage", () => {
    const offers = [
      gpuOffer("NVIDIA L40S", "A"),
      gpuOffer("NVIDIA L40S", "B"),
      gpuOffer("NVIDIA H100", "A"),
    ];
    assert.deepEqual(rankGpuModels(offers), ["NVIDIA L40S", "NVIDIA H100"]);
    assert.equal(pickDefaultGpuModel(offers), "NVIDIA H100");
    assert.equal(
      pickDefaultGpuModel(
        offers.filter((offer) => offer.model !== "NVIDIA H100"),
      ),
      "NVIDIA L40S",
    );
  });

  it("selects only LLMs measured by at least two providers", () => {
    const endpoints = [
      llmEndpoint(),
      llmEndpoint({ id: "2", endpointId: "2", provider: "Provider B" }),
      llmEndpoint({
        id: "3",
        endpointId: "3",
        permaslug: "author/unmeasured",
        provider: "Provider A",
        throughput: null,
        latencyMs: null,
      }),
      llmEndpoint({
        id: "4",
        endpointId: "4",
        permaslug: "author/unmeasured",
        provider: "Provider B",
        throughput: null,
        latencyMs: null,
      }),
    ];
    assert.deepEqual(rankLlmModelsForComparison(endpoints), ["author/model"]);
    assert.equal(pickDefaultLlmModel(endpoints), "author/model");
    assert.equal(pickDefaultLlmModel([]), "");
  });
});
