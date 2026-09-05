import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseThundercomputeRows,
  thundercomputeScraper,
} from "./thundercompute.ts";

const observedAt = "2026-09-05T12:00:00.000Z";
function fixture() {
  return {
    pricing: {
      pricing: {
        a100xl_x4: 5.96,
        a6000_x1: 0.35,
        h100_x2: 6.4,
        l40_x1: 0.79,
        a100xl_native: 1.79,
        additional_vcpus: 0.04,
      },
    },
    specs: {
      specs: {
        a100xl_x4: {
          displayName: "NVIDIA A100 (80GB)",
          vramGB: 80,
          gpuCount: 4,
          vcpuOptions: [60, 36, 44, 52],
          ramPerVCPUGiB: 8,
          ramCapGiB: 420,
          storageGB: { min: 100, max: 2000 },
        },
        a6000_x1: {
          displayName: "RTX A6000",
          vramGB: 48,
          gpuCount: 1,
          vcpuOptions: [6, 8],
          ramPerVCPUGiB: 8,
          storageGB: { min: 100, max: 500 },
        },
        h100_x2: {
          displayName: "NVIDIA H100",
          vramGB: 80,
          gpuCount: 2,
          vcpuOptions: [8, 12, 16, 20, 24],
          ramPerVCPUGiB: 8,
          storageGB: { min: 100, max: 1000 },
        },
        l40_x1: {
          displayName: "NVIDIA L40",
          vramGB: 48,
          gpuCount: 1,
          vcpuOptions: [6, 8, 12],
          ramPerVCPUGiB: 8,
          storageGB: { min: 100, max: 500 },
        },
      },
    },
    status: {
      specs: {
        a100xl_x4: "available",
        a6000_x1: "available",
        h100_x2: "available",
        l40_x1: "unavailable",
      },
      gpu_type: { h100: { "2": "unavailable" } },
    },
  };
}

describe("Thunder Compute v2 pricing", () => {
  it("joins by spec key, excludes unavailable specs and ignores legacy pricing keys", () => {
    const f = fixture();
    const rows = parseThundercomputeRows(
      f.pricing,
      f.specs,
      f.status,
      observedAt,
    );
    assert.deepEqual(
      rows.map((row) => row.sku),
      ["a100xl_x4", "a6000_x1", "h100_x2"],
    );
    assert.deepEqual(
      rows.map((row) => row.price_hour_usd),
      [5.96, 0.35, 6.4],
    );
    assert.equal(rows[2].gpu_model, "NVIDIA H100 PCIe");
    assert.equal(rows[2].gpu_count, 2);
    assert.equal(rows[2].vram_gb, 160);
    assert.ok(
      rows.every(
        (row) =>
          row.price_unit === "instance_hour" && row.observed_at === observedAt,
      ),
    );
    assert.equal(rows[0].tier, undefined);
  });

  it("uses the base CPU allocation and capped RAM, not upgraded specs", () => {
    const f = fixture();
    const [a100, a6000] = parseThundercomputeRows(
      f.pricing,
      f.specs,
      f.status,
      observedAt,
    );
    assert.equal(a100.vcpus, 36);
    assert.equal(a100.system_ram_gb, 228);
    assert.equal(a100.vram_gb, 320);
    assert.equal(a100.storage_gb, 100);
    assert.equal(a6000.gpu_model, "NVIDIA RTX A6000");
    assert.equal(a6000.vcpus, 6);
    assert.equal(a6000.system_ram_gb, 48);
    assert.equal(a6000.raw_cost, "$0.35/hr");
  });

  it("supports available L40s directly from specs", () => {
    const f = fixture();
    f.status.specs.l40_x1 = "available";
    const row = parseThundercomputeRows(
      f.pricing,
      f.specs,
      f.status,
      observedAt,
    ).find((row) => row.sku === "l40_x1");
    assert.equal(row?.gpu_model, "NVIDIA L40");
    assert.equal(row?.price_hour_usd, 0.79);
  });

  it("rejects missing prices, missing status and malformed hardware", () => {
    const f = fixture();
    assert.throws(
      () =>
        parseThundercomputeRows({ pricing: {} }, f.specs, f.status, observedAt),
      /price/,
    );
    assert.throws(
      () =>
        parseThundercomputeRows(f.pricing, f.specs, { specs: {} }, observedAt),
      /availability/,
    );
    f.specs.specs.a100xl_x4.vcpuOptions = [];
    assert.throws(() =>
      parseThundercomputeRows(f.pricing, f.specs, f.status, observedAt),
    );
  });

  it("rejects empty specs, no availability, invalid RAM and zero prices", () => {
    const f = fixture();
    assert.throws(
      () =>
        parseThundercomputeRows(f.pricing, { specs: {} }, f.status, observedAt),
      /no specifications/,
    );
    const status = {
      specs: Object.fromEntries(
        Object.keys(f.specs.specs).map((key) => [key, "unavailable"]),
      ),
    };
    assert.throws(
      () => parseThundercomputeRows(f.pricing, f.specs, status, observedAt),
      /no available/,
    );
    f.specs.specs.a100xl_x4.ramCapGiB = 1;
    assert.throws(
      () => parseThundercomputeRows(f.pricing, f.specs, f.status, observedAt),
      /configuration/,
    );
    f.pricing.pricing.a100xl_x4 = 0;
    assert.throws(
      () => parseThundercomputeRows(f.pricing, f.specs, f.status, observedAt),
      /price/,
    );
  });

  it("reads only the three public endpoints and hashes their combined payload", async (t) => {
    const f = fixture();
    const requests: string[] = [];
    t.mock.method(
      globalThis,
      "fetch",
      async (input: string, init: RequestInit) => {
        requests.push(input);
        assert.equal(init.cache, "no-store");
        assert.ok(init.signal instanceof AbortSignal);
        assert.deepEqual(init.headers, { Accept: "application/json" });
        const endpoint = input.split("/").at(-1) as keyof typeof f;
        return Response.json(f[endpoint]);
      },
    );
    const result = await thundercomputeScraper.scrape();
    assert.deepEqual(
      requests,
      ["pricing", "specs", "status"].map(
        (endpoint) => `https://api.thundercompute.com:8443/v2/${endpoint}`,
      ),
    );
    assert.equal(result.rows.length, 3);
    assert.match(result.sourceHash!, /^[a-f0-9]{64}$/);
    assert.ok(
      result.rows.every((row) => row.observed_at === result.observedAt),
    );
    f.status.specs.l40_x1 = "available";
    assert.notEqual(
      (await thundercomputeScraper.scrape()).sourceHash,
      result.sourceHash,
    );
  });

  it("propagates HTTP and invalid JSON failures instead of returning invented prices", async (t) => {
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(null, { status: 503 }),
    );
    await assert.rejects(thundercomputeScraper.scrape(), /request failed: 503/);
    mock.mock.mockImplementation(async () => new Response("not json"));
    await assert.rejects(thundercomputeScraper.scrape(), SyntaxError);
  });
});
