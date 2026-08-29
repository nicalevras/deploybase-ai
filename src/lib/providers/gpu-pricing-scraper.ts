import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import type { ProviderResult } from "@/types/pricing";
import {
  alibabaScraper,
  awsScraper,
  azureScraper,
  civoScraper,
  coreweaveScraper,
  crusoeScraper,
  digitaloceanScraper,
  flyioScraper,
  googleCloudScraper,
  hotaisleScraper,
  hyperstackScraper,
  koyebScraper,
  lambdaScraper,
  latitudeScraper,
  nebiusScraper,
  oblivusScraper,
  oracleScraper,
  oriScraper,
  paperspaceScraper,
  replicateScraper,
  runpodScraper,
  scalewayScraper,
  sesterceScraper,
  thundercomputeScraper,
  togetheraiScraper,
  vastScraper,
  verdaScraper,
  voltageParkScraper,
  vultrScraper,
} from "./index";
import type { ProviderScraper } from "./types";
import { scraperDelay } from "./validation";

interface GpuScrapeSummary {
  provider: string;
  rowsScraped: number;
  duration: number;
  success: boolean;
  sourceHash?: string;
  error?: string;
}

interface GpuScrapeAllResult {
  providerResults: ProviderResult[];
  scrapedAt: string;
  sourceHash: string;
  summaries: GpuScrapeSummary[];
}

const DEFAULT_SCRAPERS: ProviderScraper[] = [
  coreweaveScraper,
  nebiusScraper,
  hyperstackScraper,
  runpodScraper,
  lambdaScraper,
  digitaloceanScraper,
  oracleScraper,
  crusoeScraper,
  flyioScraper,
  vultrScraper,
  latitudeScraper,
  oriScraper,
  voltageParkScraper,
  googleCloudScraper,
  verdaScraper,
  scalewayScraper,
  replicateScraper,
  thundercomputeScraper,
  koyebScraper,
  sesterceScraper,
  awsScraper,
  azureScraper,
  civoScraper,
  vastScraper,
  hotaisleScraper,
  alibabaScraper,
  oblivusScraper,
  paperspaceScraper,
  togetheraiScraper,
];

class GpuPricingScraper {
  constructor(
    private readonly scrapers: ProviderScraper[] = DEFAULT_SCRAPERS,
  ) {}

  async scrapeAll(): Promise<GpuScrapeAllResult> {
    const summaries: GpuScrapeSummary[] = [];
    const providerResults: ProviderResult[] = [];

    const hash = createHash("sha256");
    const scrapedAt = new Date().toISOString();

    const PER_SCRAPER_TIMEOUT_MS = 60_000;

    for (let i = 0; i < this.scrapers.length; i++) {
      const scraper = this.scrapers[i];
      if (!scraper.enabled) continue;

      // Rate-limit: add a small delay between sequential scraper calls.
      if (i > 0) {
        await scraperDelay();
      }

      const start = Date.now();
      try {
        const result = await Promise.race([
          scraper.scrape(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Scraper ${scraper.name} timed out after ${PER_SCRAPER_TIMEOUT_MS}ms`,
                  ),
                ),
              PER_SCRAPER_TIMEOUT_MS,
            ),
          ),
        ]);
        if (!result.rows.length) {
          throw new Error(`Scraper ${scraper.name} returned zero rows`);
        }
        providerResults.push(result);

        hash.update(scraper.name);
        hash.update(result.sourceHash ?? JSON.stringify(result.rows));

        summaries.push({
          provider: scraper.name,
          rowsScraped: result.rows.length,
          duration: Date.now() - start,
          success: true,
          sourceHash: result.sourceHash,
        });
      } catch (error) {
        logger.error(
          `[GpuPricingScraper] ${scraper.name} failed:`,
          error instanceof Error ? error.message : String(error),
        );
        summaries.push({
          provider: scraper.name,
          rowsScraped: 0,
          duration: Date.now() - start,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (providerResults.length === 0) {
      const failureSummary = summaries
        .map((s) => `${s.provider}: ${s.error ?? "unknown error"}`)
        .join("; ");
      throw new Error(`All GPU pricing scrapes failed. ${failureSummary}`);
    }

    const sourceHash = hash.digest("hex");

    return {
      providerResults,
      scrapedAt,
      sourceHash,
      summaries,
    };
  }
}

export const gpuPricingScraper = new GpuPricingScraper();
