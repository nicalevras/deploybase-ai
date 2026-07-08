import crypto from "crypto";
import { logger } from "@/lib/logger";
import type { OriPriceRow, ProviderResult } from "@/types/pricing";
import * as cheerio from "cheerio";
import type { ProviderScraper } from "./types";

const PRICING_URL = "https://www.ori.co/pricing";

class OriScraper implements ProviderScraper {
  name = "ori";
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = false; // ori.co/pricing now redirects to Radiant without a pricing table

  async scrape(): Promise<ProviderResult> {
    try {
      const response = await fetch(PRICING_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Ori pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash("sha256").update(html).digest("hex");

      const $ = cheerio.load(html);
      const rows = this.parseTable($);

      // Deduplicate by instance_id
      const seenIds = new Set<string>();
      const uniqueRows = rows.filter((row) => {
        const key = row.instance_id || `${row.gpu_model}-${row.gpu_count}`;
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });

      logger.info(`[OriScraper] Parsed ${uniqueRows.length} GPU pricing rows`);

      return {
        provider: "ori",
        rows: uniqueRows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(
        `Ori scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse the GPU pricing table
   * Table columns: GPU Model, GPU Count, VRAM/GPU, vCPUs, RAM, Storage, Price
   */
  private parseTable($: cheerio.CheerioAPI): OriPriceRow[] {
    const rows: OriPriceRow[] = [];
    const observedAt = new Date().toISOString();

    // Find the pricing table
    $("table tbody tr").each((_: number, row: any) => {
      const $row = $(row);
      const cells = $row.find("td");

      if (cells.length < 7) return;

      // Extract cell values
      const gpuModelRaw = $(cells[0]).text().trim();
      const gpuCountText = $(cells[1]).text().trim(); // "1x" or "8x"
      const vramText = $(cells[2]).text().trim();
      const vcpusText = $(cells[3]).text().trim();
      const ramText = $(cells[4]).text().trim();
      const storageText = $(cells[5]).text().trim();
      const priceText = $(cells[6]).text().trim(); // "3.50/h"

      // Skip header rows or empty rows
      if (
        !gpuModelRaw ||
        !priceText ||
        gpuModelRaw.toLowerCase().includes("gpu")
      )
        return;

      // Parse GPU count from "1x" or "8x"
      const gpuCountMatch = gpuCountText.match(/(\d+)x/i);
      const gpuCount = gpuCountMatch ? parseInt(gpuCountMatch[1]) : 1;

      // Normalize GPU model name
      let gpuModel = gpuModelRaw.includes("NVIDIA")
        ? gpuModelRaw
        : `NVIDIA ${gpuModelRaw}`;
      gpuModel = gpuModel.replace(/PCIE/g, "PCIe"); // Normalize PCIE -> PCIe
      gpuModel = gpuModel.replace(/\bNVIDIA V100S\b/g, "NVIDIA Tesla V100S"); // Add Tesla prefix
      gpuModel = gpuModel.replace(/\bNVIDIA V100\b(?!S)/g, "NVIDIA Tesla V100"); // Add Tesla prefix (not V100S)

      // Parse hourly price from "3.50/h" or "$3.50/h"
      const priceMatch = priceText.match(/\$?([\d,.]+)\/?h/i);
      if (!priceMatch) return;
      const priceHourUsd = parseFloat(priceMatch[1].replace(",", ""));

      // Parse specs
      const vramGb = parseInt(vramText.replace(/[^\d]/g, "")) || undefined;
      const vcpus = parseInt(vcpusText.replace(/[^\d]/g, "")) || undefined;
      const systemRamGb = parseInt(ramText.replace(/[^\d]/g, "")) || undefined;
      const storage = storageText
        ? `${storageText.replace(/,/g, "")} GB`
        : undefined;

      // Create instance ID
      const instanceId = `${gpuModel.toLowerCase().replace(/\s+/g, "-").replace("nvidia-", "")}-${gpuCount}x`;

      rows.push({
        provider: "ori",
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: instanceId,
        gpu_model: gpuModel,
        gpu_count: gpuCount,
        vram_gb: vramGb,
        vcpus: vcpus,
        system_ram_gb: systemRamGb,
        storage: storage,
        price_unit: "instance_hour",
        price_hour_usd: priceHourUsd,
        raw_cost: priceText,
        class: "GPU",
        type: "Virtual Machine",
      });
    });

    return rows;
  }
}

export const oriScraper = new OriScraper();
