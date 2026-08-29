import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { gpuPricingStore } from "@/lib/gpu-pricing-store";
import { logger } from "@/lib/logger";
import { gpuPricingScraper } from "@/lib/providers/gpu-pricing-scraper";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const CORE_PAGE_PATHS = ["/", "/gpus", "/llms", "/tools"];

async function revalidateCorePages() {
  await Promise.all(CORE_PAGE_PATHS.map((path) => revalidatePath(path)));
}

async function runGpuPricingJob(force: boolean) {
  const startTime = Date.now();
  logger.info("[GpuPricingJob] Starting full GPU pricing scrape...");

  const scrapeResult = await gpuPricingScraper.scrapeAll();
  const { stored, touchedStableKeys } = await gpuPricingStore.replaceAll(
    scrapeResult.providerResults,
  );

  // The store resolves only after the replacement transaction commits.
  revalidateTag("pricing", "max");
  revalidateTag("favorites", "max");
  revalidateTag("research-gpu", { expire: 0 });
  revalidateTag("research-stats", { expire: 0 });
  await Promise.all([
    revalidatePath("/api"),
    ...touchedStableKeys.map((stableKey) =>
      revalidateTag(`gpu-price-history:${stableKey}`, "max"),
    ),
  ]);
  await revalidateCorePages();

  logger.info(
    `[GpuPricingJob] Cache invalidated (tags: 'pricing', 'favorites', 'research-gpu', 'research-stats', path: '/api', pages: ${CORE_PAGE_PATHS.join(", ")})`,
  );

  const duration = Date.now() - startTime;
  const totalRows = scrapeResult.providerResults.reduce(
    (acc, result) => acc + result.rows.length,
    0,
  );

  logger.info(
    `[GpuPricingJob] Scrape completed in ${duration}ms. Stored ${stored} rows.`,
  );

  return {
    success: true,
    force,
    duration,
    stored,
    rowsScraped: totalRows,
    scrapedAt: scrapeResult.scrapedAt,
    sourceHash: scrapeResult.sourceHash,
    summaries: scrapeResult.summaries,
  };
}

function validateRunRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider");
  if (providerParam && providerParam !== "all") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Partial provider scrapes are no longer supported. Use provider=all or omit the parameter.",
      },
      { status: 400 },
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const cronAuthorized = isAuthorizedCronRequest(request);
    if (!cronAuthorized && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron invocation." },
        { status: 401 },
      );
    }
    const invalidResponse = validateRunRequest(request);
    if (invalidResponse) return invalidResponse;
    const force = new URL(request.url).searchParams.get("force") === "1";
    return NextResponse.json(await runGpuPricingJob(force));
  } catch (error) {
    logger.error("Scraping job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

// GET /api/jobs/scrape - Get cache stats or trigger scraping
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const run = searchParams.get("run") === "1";
    const force = searchParams.get("force") === "1";
    const cronAuthorized = isAuthorizedCronRequest(request);
    const shouldRunJob = cronAuthorized || run;

    const invalidResponse = validateRunRequest(request);
    if (invalidResponse) return invalidResponse;

    if (shouldRunJob) {
      if (!cronAuthorized && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized cron invocation.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(await runGpuPricingJob(force));
    }

    const stats = await gpuPricingStore.getCacheStats();
    return NextResponse.json({
      status: "operational",
      totalRows: stats.totalRows,
      providers: stats.providers,
      lastScrapedAt: stats.lastScrapedAt,
    });
  } catch (error) {
    logger.error("Cache stats / cron failed:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Periodic maintenance endpoint (e.g., cron ping)
export async function PUT(_request: NextRequest) {
  try {
    return NextResponse.json({ ok: true, removed: 0 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
