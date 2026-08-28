import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { modelsThroughputScraper } from "@/lib/providers/models-throughput-scraper";
import { logger } from "@/lib/logger";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const CORE_PAGE_PATHS = ["/", "/gpus", "/llms", "/tools"];

async function revalidateCorePages() {
  await Promise.all(CORE_PAGE_PATHS.map((path) => revalidatePath(path)));
}

async function runThroughputScrape(limit?: number) {
  const start = Date.now();
  const result = await modelsThroughputScraper.scrapeAll(limit);
  const duration = Date.now() - start;

  if (result.touchedPermaslugs.length > 0) {
    await Promise.all(
      result.touchedPermaslugs.map((permaslug) =>
        revalidateTag(`model-throughput:${permaslug}`, 'max'),
      ),
    );
  }
  revalidateTag("research-llm", { expire: 0 });
  await revalidateCorePages();

  logger.info(
    JSON.stringify({
      event: "jobs.scrape-throughput.completed",
      permaslugsRequested: result.permaslugsRequested,
      permaslugsProcessed: result.permaslugsProcessed,
      permaslugsFailed: result.permaslugsFailed,
      samplesStored: result.samplesStored,
      clearedSamples: result.clearedSamples,
      duration,
      pagesRevalidated: CORE_PAGE_PATHS,
    }),
  );

  return {
    success: true,
    duration,
    ...result,
  };
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

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    return NextResponse.json(await runThroughputScrape(limit));
  } catch (error) {
    logger.error(
      JSON.stringify({
        event: "jobs.scrape-throughput.failed",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape throughput",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cronAuthorized = isAuthorizedCronRequest(request);
    if (!cronAuthorized && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized cron invocation.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(await runThroughputScrape());
  } catch (error) {
    logger.error(
      JSON.stringify({
        event: "jobs.scrape-throughput.failed",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape throughput",
      },
      { status: 500 },
    );
  }
}
