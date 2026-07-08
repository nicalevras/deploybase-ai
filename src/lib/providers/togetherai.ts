import crypto from "crypto";
import { logger } from "@/lib/logger";
import type { ProviderResult, TogetherAIPriceRow } from "@/types/pricing";
import * as cheerio from "cheerio";
import type { ProviderScraper } from "./types";

const SOURCE_URL = "https://www.together.ai/pricing";

// GPU specs from NVIDIA - verified
const GPU_SPECS: Record<string, { vramPerGpu: number; model: string }> = {
  "NVIDIA HGX H100": { vramPerGpu: 80, model: "NVIDIA H100 SXM" },
  "NVIDIA HGX H200": { vramPerGpu: 141, model: "NVIDIA H200" },
  "NVIDIA HGX B200": { vramPerGpu: 192, model: "NVIDIA B200" },
  "NVIDIA HGX B300": { vramPerGpu: 288, model: "NVIDIA B300" },
  "NVIDIA GB200 NVL72": { vramPerGpu: 180, model: "NVIDIA GB200 NVL72" },
};

class TogetherAIScraper implements ProviderScraper {
  name = "togetherai";
  url = SOURCE_URL;
  scrapeIntervalMinutes = 1440; // Daily
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      logger.info("[TogetherAIScraper] Fetching pricing page...");
      const observedAt = new Date().toISOString();

      const response = await fetch(SOURCE_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pricing page: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const rows: TogetherAIPriceRow[] = [];

      const bestByModel = new Map<string, TogetherAIPriceRow>();

      $("table tbody tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const gpuName = this.normalizeGpuName($(cells[0]).text().trim());
        const hourlyPriceText = $(cells[1]).text().trim();

        const specs = GPU_SPECS[gpuName];
        if (!specs) return;

        const priceMatch = hourlyPriceText.match(/\$(\d+\.?\d*)/);
        if (!priceMatch) return;

        const pricePerGpu = parseFloat(priceMatch[1]);
        if (pricePerGpu <= 0) return;

        const instanceId = `hgx-${specs.model
          .toLowerCase()
          .replace(/nvidia\s+/i, "")
          .replace(/\s+/g, "-")}-8x`;
        const clusterPrice = pricePerGpu * 8;
        const totalVram = specs.vramPerGpu * 8;

        const parsedRow: TogetherAIPriceRow = {
          provider: "togetherai",
          source_url: SOURCE_URL,
          observed_at: observedAt,
          instance_id: instanceId,
          gpu_model: specs.model,
          gpu_count: 8,
          vram_gb: totalVram,
          price_unit: "cluster_hour",
          price_hour_usd: clusterPrice,
          currency: "USD",
          class: "GPU",
          type: "Virtual Machine",
        };

        const existing = bestByModel.get(specs.model);
        if (!existing || parsedRow.price_hour_usd < existing.price_hour_usd) {
          logger.info(
            `[TogetherAIScraper] ${gpuName}: $${pricePerGpu}/GPU/hr → $${clusterPrice}/cluster/hr (8x)`,
          );
          bestByModel.set(specs.model, parsedRow);
        }
      });

      rows.push(...bestByModel.values());

      logger.info(
        `[TogetherAIScraper] Parsed ${rows.length} GPU cluster pricing rows`,
      );

      return {
        provider: "togetherai",
        rows,
        observedAt,
        sourceHash: crypto
          .createHash("sha256")
          .update(JSON.stringify(rows))
          .digest("hex"),
      };
    } catch (error) {
      throw new Error(
        `Together AI scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private normalizeGpuName(name: string): string {
    return name
      .replace(/\bHGX\s+HGX\b/i, "HGX")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const togetheraiScraper = new TogetherAIScraper();
