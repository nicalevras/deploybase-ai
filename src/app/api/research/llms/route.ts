import { getLlmChartPayload } from "@/lib/research/loader";
import { logger } from "@/lib/logger";
import { resolveResearchRouteResult } from "@/lib/research/route-result";
import { NextRequest, NextResponse } from "next/server";

const RESPONSE_HEADERS = {
  // The tagged server dataset is cached. Keeping the Route Handler response
  // uncached ensures scraper invalidation is not masked by a stale CDN copy.
  "Cache-Control": "private, no-store",
};

export async function GET(request: NextRequest) {
  const permaslug =
    request.nextUrl.searchParams.get("permaslug")?.trim() ?? "";
  if (!permaslug || permaslug.length > 200) {
    return NextResponse.json(
      { error: "A valid LLM model is required." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const result = await resolveResearchRouteResult(
    () => getLlmChartPayload(permaslug),
    {
      notFound: "LLM model is not available.",
      unavailable: "LLM research data is temporarily unavailable.",
    },
  );

  if (result.status === 503) {
    logger.error("[Research API] Failed to load LLM chart payload", {
      permaslug,
      error:
        result.cause instanceof Error
          ? result.cause.message
          : String(result.cause),
    });
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: RESPONSE_HEADERS,
  });
}
