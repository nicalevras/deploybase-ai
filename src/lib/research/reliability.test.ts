import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLICATION_TABLES,
  evaluateMigrationGuard,
} from "../../../scripts/migration-guard.ts";
import {
  getExternalFilterSignature,
  isColumnFilterParameter,
} from "../../features/data-explorer/data-table/filter-state.ts";
import { buildCategoryCollectionJsonLd } from "../article-category-structured-data.ts";
import { getOAuthAvailability } from "../auth-configuration.ts";
import { commitGpuSnapshotAtomically } from "../gpu-snapshot-replacement.ts";
import { resolveProviderFromValues } from "../provider-route.ts";
import { resolveRedisConfiguration } from "../redis/configuration.ts";
import { BoundedMemoryRateLimiter } from "../redis/memory-rate-limiter.ts";
import { fetchResearchSelection } from "./selection-request.ts";

describe("atomic GPU snapshot replacement", () => {
  it("runs replacement and history writes inside one transaction", async () => {
    const events: string[] = [];
    const touched = await commitGpuSnapshotAtomically<
      { transaction: boolean },
      string,
      string
    >({
      rows: ["pricing"],
      historySamples: ["history"],
      transaction: async (work) => {
        events.push("begin");
        const result = await work({ transaction: true });
        events.push("commit");
        return result;
      },
      replaceCurrent: async (tx, rows) => {
        assert.equal(tx.transaction, true);
        assert.deepEqual(rows, ["pricing"]);
        events.push("replace");
      },
      appendHistory: async (tx, samples) => {
        assert.equal(tx.transaction, true);
        assert.deepEqual(samples, ["history"]);
        events.push("history");
        return ["stable-key"];
      },
    });

    assert.deepEqual(events, ["begin", "replace", "history", "commit"]);
    assert.deepEqual(touched, ["stable-key"]);
  });

  it("rejects an empty aggregate before opening a transaction", async () => {
    let transactionCalls = 0;
    await assert.rejects(
      commitGpuSnapshotAtomically({
        rows: [],
        historySamples: [],
        transaction: async (work) => {
          transactionCalls += 1;
          return work({});
        },
        replaceCurrent: async () => undefined,
        appendHistory: async () => [],
      }),
      /empty snapshot/,
    );
    assert.equal(transactionCalls, 0);
  });
});

describe("provider routing", () => {
  it("rejects unknown providers and canonicalizes valid variants", () => {
    assert.equal(resolveProviderFromValues("unknown", ["RunPod"], "gpu"), null);
    assert.deepEqual(resolveProviderFromValues("RunPod", ["runpod"], "gpu"), {
      value: "runpod",
      segment: "runpod",
      isCanonical: false,
    });
    assert.deepEqual(
      resolveProviderFromValues(
        "google%20ai%20studio",
        ["Google AI Studio"],
        "llm",
      ),
      {
        value: "Google AI Studio",
        segment: "Google%20AI%20Studio",
        isCanonical: false,
      },
    );
  });
});

describe("research selection retry", () => {
  it("can retry the same failed selection without changing its request", async () => {
    const urls: string[] = [];
    const fetcher = (async (input: string | URL | Request) => {
      urls.push(String(input));
      if (urls.length === 1) return new Response(null, { status: 503 });
      return Response.json({ model: "H100" });
    }) as typeof fetch;

    await assert.rejects(
      fetchResearchSelection(fetcher, "/api/research/gpus", "model", "H100"),
      /unavailable/,
    );
    assert.deepEqual(
      await fetchResearchSelection(
        fetcher,
        "/api/research/gpus",
        "model",
        "H100",
      ),
      { model: "H100" },
    );
    assert.deepEqual(urls, [
      "/api/research/gpus?model=H100",
      "/api/research/gpus?model=H100",
    ]);
  });
});

describe("optional runtime configuration", () => {
  it("enables OAuth providers only for complete credential pairs", () => {
    assert.deepEqual(
      getOAuthAvailability({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
        GITHUB_CLIENT_ID: "partial",
      }),
      { google: true, github: false, huggingface: false },
    );
  });

  it("uses a bounded in-memory limiter when shared storage is unavailable", async () => {
    assert.equal(
      resolveRedisConfiguration({ UPSTASH_REDIS_REST_URL: "partial" }),
      null,
    );
    assert.deepEqual(
      resolveRedisConfiguration({
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "token",
      }),
      { url: "https://redis.example", token: "token" },
    );

    let now = 1_000;
    const limiter = new BoundedMemoryRateLimiter(2, 1_000, 2, () => now);
    assert.equal((await limiter.limit("a")).success, true);
    assert.equal((await limiter.limit("a")).success, true);
    assert.equal((await limiter.limit("a")).success, false);
    now = 2_001;
    assert.equal((await limiter.limit("a")).success, true);
  });
});

describe("table filter stability", () => {
  it("keeps shared-link UUIDs out of active column filters", () => {
    assert.equal(isColumnFilterParameter("uuid"), false);
    assert.equal(isColumnFilterParameter("bookmarks"), false);
    assert.equal(isColumnFilterParameter("provider"), true);
  });

  it("does not change a slider signature for unrelated filters", () => {
    const before = getExternalFilterSignature(
      [{ id: "price", value: [1, 10] }],
      "price",
    );
    const after = getExternalFilterSignature(
      [
        { id: "price", value: [1, 10] },
        { id: "provider", value: ["RunPod"] },
      ],
      "price",
    );
    assert.equal(before, after);
  });
});

describe("category structured data", () => {
  it("reports the full count while limiting detailed entries to 50", () => {
    const articles = Array.from({ length: 75 }, (_, index) => ({
      slug: `article-${index}`,
      title: `Article ${index}`,
    }));
    const jsonLd = buildCategoryCollectionJsonLd(
      { name: "GPU Pricing", description: "Pricing research" },
      "gpu-pricing",
      articles,
    );
    assert.equal(jsonLd.mainEntity.numberOfItems, 75);
    assert.equal(jsonLd.mainEntity.itemListElement.length, 50);
  });
});

describe("migration guard", () => {
  const baseline = { hash: "baseline", createdAt: 1 };

  it("permits a fresh database", () => {
    assert.equal(
      evaluateMigrationGuard({
        applicationTables: [],
        databaseMigrations: [],
        localMigrations: [baseline],
      }).state,
      "fresh",
    );
  });

  it("permits a fully baselined database", () => {
    assert.equal(
      evaluateMigrationGuard({
        applicationTables: [...APPLICATION_TABLES],
        databaseMigrations: [baseline],
        localMigrations: [baseline],
      }).state,
      "baselined",
    );
  });

  it("refuses an existing schema with an empty migration log", () => {
    const decision = evaluateMigrationGuard({
      applicationTables: ["gpu_pricing"],
      databaseMigrations: [],
      localMigrations: [baseline],
    });
    assert.equal(decision.state, "dangerous");
    assert.equal(decision.allowed, false);
  });

  it("refuses an empty local migration history", () => {
    assert.equal(
      evaluateMigrationGuard({
        applicationTables: [],
        databaseMigrations: [],
        localMigrations: [],
      }).state,
      "invalid",
    );
  });

  it("refuses a database history that is not an ordered local prefix", () => {
    const decision = evaluateMigrationGuard({
      applicationTables: [...APPLICATION_TABLES],
      databaseMigrations: [{ hash: "future", createdAt: 2 }],
      localMigrations: [baseline, { hash: "future", createdAt: 2 }],
    });
    assert.equal(decision.state, "invalid");
    assert.equal(decision.allowed, false);
  });
});
