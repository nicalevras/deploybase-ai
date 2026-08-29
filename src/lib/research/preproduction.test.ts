import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newestIsoTimestamp, toIsoTimestamp } from "./freshness.ts";
import {
  createHomepageResearchManifest,
  formatResearchTotal,
} from "./manifest.ts";
import { createRetryableLoader } from "./retryable-loader.ts";
import {
  newestArticleDate,
  newestSitemapDate,
  resolveArticleModifiedDate,
} from "./sitemap-dates.ts";
import {
  buildGpuDatasetStructuredData,
  buildHomepageStructuredData,
  buildLlmDatasetStructuredData,
  combineStructuredData,
} from "./structured-data.ts";

describe("retryable chart loading", () => {
  it("clears a rejected import and succeeds on manual retry", async () => {
    let attempts = 0;
    const loader = createRetryableLoader(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("chunk unavailable");
      return "chart";
    });

    await assert.rejects(loader.load(), /chunk unavailable/);
    loader.reset();
    assert.equal(await loader.load(), "chart");
    assert.equal(attempts, 2);
  });

  it("deduplicates successful imports until explicitly reset", async () => {
    let attempts = 0;
    const loader = createRetryableLoader(async () => ++attempts);

    assert.equal(await loader.load(), 1);
    assert.equal(await loader.load(), 1);
    loader.reset();
    assert.equal(await loader.load(), 2);
  });
});

describe("research freshness", () => {
  it("selects the newest valid factual timestamp", () => {
    assert.equal(
      newestIsoTimestamp([
        "2026-08-25T10:00:00.000Z",
        new Date("2026-08-27T15:30:00.000Z"),
        "invalid",
        null,
      ]),
      "2026-08-27T15:30:00.000Z",
    );
    assert.equal(toIsoTimestamp("invalid"), null);
  });
});

describe("homepage research manifest", () => {
  it("contains chart manifests without duplicating market totals", () => {
    const manifest = createHomepageResearchManifest(
      {
        options: [],
        initial: { model: "", offers: [] },
      },
      {
        options: [],
        initial: {
          selection: "featured",
          isMultiModelView: true,
          endpoints: [],
        },
      },
    );

    assert.deepEqual(Object.keys(manifest).sort(), ["gpu", "llm"]);
    assert.equal("totals" in manifest, false);
  });

  it("shows unavailable totals honestly", () => {
    assert.equal(formatResearchTotal(null), "—");
    assert.equal(formatResearchTotal(undefined), "—");
    assert.equal(formatResearchTotal(1234), (1234).toLocaleString());
  });
});

describe("canonical Dataset placement", () => {
  it("keeps Dataset nodes off the homepage graph", () => {
    const homepage = buildHomepageStructuredData({
      title: "Deploybase",
      description: "Research",
    });
    const graph = homepage["@graph"] as Array<Record<string, unknown>>;
    assert.deepEqual(
      graph.map((node) => node["@type"]),
      ["Organization", "WebSite", "WebPage"],
    );
  });

  it("adds dated canonical Dataset nodes to explorer graphs", () => {
    const gpu = buildGpuDatasetStructuredData("2026-08-27T10:00:00.000Z");
    const llm = buildLlmDatasetStructuredData("2026-08-27T11:00:00.000Z");
    const graph = combineStructuredData(gpu, llm)["@graph"] as Array<
      Record<string, unknown>
    >;

    assert.equal(graph.length, 2);
    assert.equal(graph.every((node) => node["@type"] === "Dataset"), true);
    assert.equal(graph[0].dateModified, "2026-08-27T10:00:00.000Z");
    assert.equal(graph[1].dateModified, "2026-08-27T11:00:00.000Z");
  });
});

describe("sitemap date resolution", () => {
  const articles = [
    {
      category: "GPU Pricing",
      date: "2026-08-20",
      dateModified: "2026-08-27",
    },
    { category: "GPU Pricing", date: "2026-08-26" },
    { category: "LLM Pricing", date: "2026-08-25" },
  ];

  it("prefers article modification dates and scopes category freshness", () => {
    assert.equal(
      resolveArticleModifiedDate(articles[0])?.toISOString(),
      "2026-08-27T00:00:00.000Z",
    );
    assert.equal(
      newestArticleDate(articles, "gpu-pricing")?.toISOString(),
      "2026-08-27T00:00:00.000Z",
    );
    assert.equal(
      newestArticleDate(articles, "llm-pricing")?.toISOString(),
      "2026-08-25T00:00:00.000Z",
    );
  });

  it("omits invalid dates instead of inventing a current timestamp", () => {
    assert.equal(newestSitemapDate([null, "not-a-date"]), undefined);
  });
});
