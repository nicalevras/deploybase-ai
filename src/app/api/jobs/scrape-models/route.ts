import { NextRequest, NextResponse } from 'next/server';
import { modelsScraper } from '@/lib/providers/models-scraper';
import { modelsCache } from '@/lib/models-cache';
import { logger } from '@/lib/logger';
import { revalidatePath, revalidateTag } from 'next/cache';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

const CORE_PAGE_PATHS = ["/", "/gpus", "/llms", "/tools"];

async function revalidateCorePages() {
  await Promise.all(CORE_PAGE_PATHS.map((path) => revalidatePath(path)));
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

    const startTime = Date.now();

    // Get limit from query parameter for testing
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Run the scraper
    logger.info(`[ModelsScraper] Starting AI models scraping job${limit ? ` (limit: ${limit})` : ''}...`);
    const result = await modelsScraper.scrapeAll(limit);

    // Store the results in PostgreSQL (wipe and replace)
    const modelsStored = await modelsCache.storeModels(result);

    // Invalidate data/tagged caches and route caches
    // This ensures all cached queries are refreshed with the new scraped data:
    // - 'models' tag: invalidates getCachedFacets and getCachedModelsFiltered (main table)
    // - 'model-favorites' tag: invalidates getCachedFavoriteModelsFiltered (favorites table)
    //   (favorites cache includes model data via JOIN, so it must be invalidated too)
    revalidateTag('models', 'max');
    revalidateTag('model-favorites', 'max');
    revalidateTag('research-llm', { expire: 0 });
    revalidateTag('research-stats', { expire: 0 });
    await Promise.all([
      revalidatePath('/api'),
      revalidatePath('/api/models'),
    ]);
    await revalidateCorePages();
    
    logger.info(`[ModelsScraper] Cache invalidated (tags: 'models', 'model-favorites', 'research-llm', 'research-stats', paths: '/api', '/api/models', pages: ${CORE_PAGE_PATHS.join(', ')})`);

    const duration = Date.now() - startTime;

    logger.info(`[ModelsScraper] Scraping completed in ${duration}ms. Stored ${modelsStored} models.`);

    return NextResponse.json({
      success: true,
      modelsScraped: result.models.length,
      modelsStored,
      duration,
      scrapedAt: result.scrapedAt,
      sourceHash: result.sourceHash,
    });

  } catch (error) {
    logger.error('Models scraping job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}

// GET /api/jobs/scrape-models - Get cache stats or trigger scraping
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const run = searchParams.get('run') === '1';
    const cronAuthorized = isAuthorizedCronRequest(request);
    const shouldRunJob = cronAuthorized || run;

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

      // Trigger scraping
      const startTime = Date.now();
      logger.info('[ModelsScraper] [cron] Starting AI models scraping job...');

      const result = await modelsScraper.scrapeAll();
      const modelsStored = await modelsCache.storeModels(result);

      // Invalidate caches
      // This ensures all cached queries are refreshed with the new scraped data:
      // - 'models' tag: invalidates getCachedFacets and getCachedModelsFiltered (main table)
      // - 'model-favorites' tag: invalidates getCachedFavoriteModelsFiltered (favorites table)
      //   (favorites cache includes model data via JOIN, so it must be invalidated too)
      revalidateTag('models', 'max');
      revalidateTag('model-favorites', 'max');
      revalidateTag('research-llm', { expire: 0 });
      revalidateTag('research-stats', { expire: 0 });
      await Promise.all([
        revalidatePath('/api'),
        revalidatePath('/api/models'),
      ]);
      await revalidateCorePages();
      
      logger.info(`[ModelsScraper] [cron] Cache invalidated (tags: 'models', 'model-favorites', 'research-llm', 'research-stats', paths: '/api', '/api/models', pages: ${CORE_PAGE_PATHS.join(', ')})`);

      const duration = Date.now() - startTime;
      logger.info(`[ModelsScraper] [cron] Scraping completed in ${duration}ms. Stored ${modelsStored} models.`);

      return NextResponse.json({
        success: true,
        modelsScraped: result.models.length,
        modelsStored,
        duration,
        scrapedAt: result.scrapedAt,
        sourceHash: result.sourceHash,
      });
    }

    // Default: return cache stats
    const stats = await modelsCache.getCacheStats();
    return NextResponse.json({
      status: 'operational',
      totalModels: stats.totalModels,
      providers: stats.providers,
      lastScrapedAt: stats.lastScrapedAt,
    });

  } catch (error) {
    logger.error('Models cache stats / cron failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
