import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLegacyArticleSearchRedirect,
  getLegacyGpuRedirect,
  getLegacyGpuRedirectFromSearchParams,
} from "./legacy-query.ts";

describe("legacy root GPU query redirects", () => {
  it("leaves the homepage and campaign parameters on the homepage", () => {
    assert.equal(getLegacyGpuRedirect({}), null);
    assert.equal(
      getLegacyGpuRedirect({ utm_source: "newsletter", ref: "launch" }),
      null,
    );
  });

  it("redirects recognized GPU filters while preserving the complete query", () => {
    assert.equal(
      getLegacyGpuRedirect({
        gpu_model: "NVIDIA H100",
        utm_source: "newsletter",
      }),
      "/gpus?gpu_model=NVIDIA+H100&utm_source=newsletter",
    );
  });

  it("preserves repeated values", () => {
    assert.equal(
      getLegacyGpuRedirect({ provider: ["Lambda", "CoreWeave"] }),
      "/gpus?provider=Lambda&provider=CoreWeave",
    );
  });

  it("handles request URL parameters without dropping duplicate filters", () => {
    const params = new URLSearchParams("provider=Lambda&provider=CoreWeave");
    assert.equal(
      getLegacyGpuRedirectFromSearchParams(params),
      "/gpus?provider=Lambda&provider=CoreWeave",
    );
  });
});

describe("legacy article search redirects", () => {
  it("redirects article searches while preserving the complete query", () => {
    const params = new URLSearchParams(
      "search=H100+pricing&utm_source=archive",
    );
    assert.equal(
      getLegacyArticleSearchRedirect("/articles", params),
      "/articles/search?search=H100+pricing&utm_source=archive",
    );
  });

  it("leaves article campaign URLs and unrelated routes untouched", () => {
    assert.equal(
      getLegacyArticleSearchRedirect(
        "/articles",
        new URLSearchParams("utm_source=archive"),
      ),
      null,
    );
    assert.equal(
      getLegacyArticleSearchRedirect(
        "/articles/category/gpu-pricing",
        new URLSearchParams("search=H100"),
      ),
      null,
    );
  });
});
