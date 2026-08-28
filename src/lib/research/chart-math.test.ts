import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEscalatingPriceAxis, buildThroughputAxis } from "./chart-math.ts";

describe("research chart axes", () => {
  it("rounds ordinary throughput up to the next 50", () => {
    assert.deepEqual(buildThroughputAxis([21, 214]), {
      domain: [0, 250],
      domainMax: 250,
      ticks: [0, 50, 100, 150, 200, 250],
    });
  });

  it("uses larger nice increments for throughput outliers", () => {
    const axis = buildThroughputAxis([100, 4_400]);
    assert.deepEqual(axis.domain, [0, 5_000]);
    assert.equal(axis.ticks.length, 6);
  });

  it("builds an escalating price scale with space around the data", () => {
    const axis = buildEscalatingPriceAxis([0.2, 50]);
    assert.deepEqual(axis.domain, [0.1, 100]);
    assert.deepEqual(axis.ticks, [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]);
  });
});
