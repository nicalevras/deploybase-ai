import { STANDARD_CACHE_TTL } from "@/lib/cache/constants";
import { gpuPriceHistoryCache } from "@/lib/gpu-price-history-cache";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const getCachedHistory = (stableKey: string) =>
  unstable_cache(
    async () => gpuPriceHistoryCache.getSeries(stableKey),
    ["gpu-price-history", stableKey],
    {
      revalidate: STANDARD_CACHE_TTL,
      tags: [`gpu-price-history:${stableKey}`],
    },
  )();

const getCachedMarketHistory = (model: string, type: string) =>
  unstable_cache(
    async () => gpuPriceHistoryCache.getMarketSeries(model, type),
    ["gpu-price-market-history", model, type],
    {
      revalidate: STANDARD_CACHE_TTL,
      tags: ["pricing"],
    },
  )();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model")?.trim();

  if (model) {
    const type = searchParams.get("type")?.trim() || "All types";
    const series = await getCachedMarketHistory(model, type);
    return NextResponse.json({ model, type, series });
  }

  const stableKey =
    searchParams.get("stableKey") ?? searchParams.get("stable_key");

  if (!stableKey) {
    return NextResponse.json(
      { error: "stableKey is required" },
      { status: 400 },
    );
  }

  const series = await getCachedHistory(stableKey);

  return NextResponse.json({
    stableKey,
    series,
  });
}
