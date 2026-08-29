import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeArticleAuthor } from "../article-brand.ts";
import { normalizeArticleSearchText } from "../article-search.ts";
import { CACHE_SIZE_LIMIT_BYTES } from "../cache/constants.ts";
import {
  RESEARCH_CACHE_WARNING_BYTES,
  ResearchCacheSizeError,
  assertResearchCacheSize,
  readWithResearchCacheFallback,
} from "./cache-safety.ts";
import {
  FEATURED_LLM_PROVIDERS,
  FEATURED_RELEASE_START,
} from "./featured.ts";
import { isFeaturedLlmEndpoint } from "./analytics.ts";
import { resolveResearchRouteResult } from "./route-result.ts";
import type { ResearchLlmEndpoint } from "./types.ts";

describe("research cache safety", () => {
  it("warns at 75 percent of the shared cache limit", () => {
    assert.equal(
      RESEARCH_CACHE_WARNING_BYTES,
      Math.floor(CACHE_SIZE_LIMIT_BYTES * 0.75),
    );
  });

  it("accepts compact datasets and rejects entries over 2 MB", () => {
    const compact = [{ id: "one" }];
    assert.equal(assertResearchCacheSize("compact", compact), compact);
    assert.throws(
      () =>
        assertResearchCacheSize("oversized", [
          { value: "x".repeat(CACHE_SIZE_LIMIT_BYTES) },
        ]),
      ResearchCacheSizeError,
    );
  });

  it("uses a direct read only for cache-size failures", async () => {
    let directReads = 0;
    const result = await readWithResearchCacheFallback(
      "fixture",
      async () => {
        throw new ResearchCacheSizeError("fixture", 3_000_000, 1_000);
      },
      async () => {
        directReads += 1;
        return ["direct"];
      },
    );

    assert.deepEqual(result, ["direct"]);
    assert.equal(directReads, 1);
    await assert.rejects(
      () =>
        readWithResearchCacheFallback(
          "fixture",
          async () => {
            throw new Error("database unavailable");
          },
          async () => ["direct"],
        ),
      /database unavailable/,
    );
  });
});

describe("research URL and search behavior", () => {
  it("keeps the featured release boundary fixed with no end date", () => {
    assert.equal(
      FEATURED_RELEASE_START,
      Date.parse("2026-05-25T00:00:00.000Z"),
    );

    const futureEndpoint = {
      provider: FEATURED_LLM_PROVIDERS[0],
      permaslug: "anthropic/future-model",
      releasedAt: "2030-01-01T00:00:00.000Z",
      hasTextOutput: true,
      outputModalities: ["text"],
    } as ResearchLlmEndpoint;
    assert.equal(
      isFeaturedLlmEndpoint(futureEndpoint, {
        providers: new Set(FEATURED_LLM_PROVIDERS),
        releasedAfter: FEATURED_RELEASE_START,
        fallbackPermaslugs: new Set(),
      }),
      true,
    );
  });

  it("normalizes article queries without a server-locale dependency", () => {
    assert.equal(normalizeArticleSearchText("  GPU PRICING  "), "gpu pricing");
    assert.equal(normalizeArticleSearchText(undefined), "");
  });

  it("normalizes the Deploybase organization author consistently", () => {
    assert.equal(normalizeArticleAuthor("DeployBase"), "Deploybase");
    assert.equal(normalizeArticleAuthor("Jane Smith"), "Jane Smith");
  });
});

describe("research route failures", () => {
  it("converts loader failures into stable 503 responses", async () => {
    const result = await resolveResearchRouteResult(
      async () => {
        throw new Error("database unavailable");
      },
      {
        notFound: "Not found.",
        unavailable: "Temporarily unavailable.",
      },
    );

    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { error: "Temporarily unavailable." });
    assert.match(
      result.cause instanceof Error ? result.cause.message : "",
      /database unavailable/,
    );
  });
});
