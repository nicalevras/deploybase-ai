import crypto from "crypto";
import { logger } from "@/lib/logger";
import type { ProviderResult, RunPodPriceRow } from "@/types/pricing";
import * as cheerio from "cheerio";
import type { ProviderScraper } from "./types";

const PRICING_URL = "https://www.runpod.io/pricing";

class RunPodScraper implements ProviderScraper {
  name = "runpod";
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      // Fetch the pricing page with proper browser headers
      const response = await fetch(this.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch RunPod pricing page: ${response.status}`,
        );
      }

      const html = await response.text();
      const sourceHash = crypto.createHash("sha256").update(html).digest("hex");

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "runpod",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(
        `RunPod scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private parsePricingPage(html: string): RunPodPriceRow[] {
    const rows: RunPodPriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Current Webflow pricing table.
    $(".gpu_table-row").each((_, element) => {
      const $row = $(element);
      const rawGpuName = $row.find(".gpu_name").first().text().trim();
      const priceText = $row.find(".active-price").first().text().trim();
      const priceAttr =
        $row.find(".gpu_table-price").first().attr("data-community") ||
        $row.find(".gpu_table-price").first().attr("data-secure");
      const price = parseFloat(priceAttr || priceText);

      if (!rawGpuName || isNaN(price) || price <= 0) return;

      let vramGb: number | undefined;
      let systemRamGb: number | undefined;
      let vcpus: number | undefined;

      $row.find(".gpu_table-tag").each((_, tag) => {
        const text = $(tag).text().replace(/\s+/g, " ").trim();
        const numberMatch = text.match(/(\d+)/);
        if (!numberMatch) return;
        const value = parseInt(numberMatch[1], 10);

        if (/\b(?:VRAM|HBM\w*)\b/i.test(text)) {
          vramGb = value;
        } else if (/\bRAM\b/i.test(text)) {
          systemRamGb = value;
        } else if (/vCPUs?/i.test(text)) {
          vcpus = value;
        }
      });

      if (!vramGb || !systemRamGb || !vcpus) {
        logger.warn(
          `Skipping GPU ${rawGpuName}: missing specs (VRAM: ${vramGb}, RAM: ${systemRamGb}, vCPUs: ${vcpus})`,
        );
        return;
      }

      const deployLink =
        $row.find('a[href*="console.runpod.io/deploy"]').attr("href") || "";
      const instanceIdMatch = deployLink.match(/[?&]gpu=([^&]+)/);
      const instanceId = instanceIdMatch
        ? decodeURIComponent(instanceIdMatch[1]).replace(/\+/g, " ")
        : rawGpuName;

      rows.push({
        provider: "runpod",
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: instanceId,
        gpu_model: this.normalizeGpuModel(rawGpuName),
        gpu_count: 1,
        vram_gb: vramGb,
        vcpus,
        system_ram_gb: systemRamGb,
        price_unit: "gpu_hour",
        price_hour_usd: price,
        raw_cost: `$${price.toFixed(2)}/hr`,
        class: "GPU",
        type: "Virtual Machine",
      });
    });

    if (rows.length > 0) return rows;

    // Legacy table fallback.
    $(".gpu-pricing-row").each((_, element) => {
      const $row = $(element);

      // Extract GPU model name
      const gpuModel = $row
        .find(".gpu-pricing-row__model-wrapper")
        .text()
        .trim();
      if (!gpuModel) return; // Skip if no GPU model found

      // Extract instance ID from deploy link
      const deployLink = $row.attr("href") || "";
      const instanceIdMatch = deployLink.match(/gpu=([^&]+)/);
      const instanceId = instanceIdMatch
        ? decodeURIComponent(instanceIdMatch[1]).replace(/\+/g, " ")
        : undefined;

      // Extract hardware specs from tags
      const tags = $row.find(".gpu-pricing-row__tag");
      let vramGb: number | undefined;
      let systemRamGb: number | undefined;
      let vcpus: number | undefined;

      tags.each((_, tag) => {
        const $tag = $(tag);
        const value = parseInt($tag.find(".body-s").first().text().trim());
        const label = $tag.find(".body-s").last().text().trim().toLowerCase();

        if (label.includes("vram")) {
          vramGb = value;
        } else if (label.includes("ram") && !label.includes("vram")) {
          systemRamGb = value;
        } else if (label.includes("vcpus") || label.includes("vCPU")) {
          vcpus = value;
        }
      });

      // Skip if we don't have essential specs
      if (!vramGb || !systemRamGb || !vcpus) {
        logger.warn(
          `Skipping GPU ${gpuModel}: missing specs (VRAM: ${vramGb}, RAM: ${systemRamGb}, vCPUs: ${vcpus})`,
        );
        return;
      }

      // Extract community cloud pricing only (default pricing shown in table)
      const communityCloudPrice = $row
        .find("[data-community-cloud-price]")
        .attr("data-community-cloud-price");

      // Create entry for community cloud pricing only
      if (communityCloudPrice && communityCloudPrice.trim() !== "") {
        const price = parseFloat(communityCloudPrice);
        if (!isNaN(price)) {
          // Normalize RTX Pro to RTX PRO (case-sensitive: only for RTX models, not AMD Pro)
          const normalizedGpuModel = gpuModel.replace(
            /\b(RTX)\s+Pro\b/g,
            "$1 PRO",
          );
          rows.push({
            provider: "runpod",
            source_url: PRICING_URL,
            observed_at: observedAt,
            instance_id: instanceId,
            gpu_model: `NVIDIA ${normalizedGpuModel}`,
            gpu_count: 1,
            vram_gb: vramGb,
            vcpus: vcpus,
            system_ram_gb: systemRamGb,
            price_unit: "gpu_hour",
            price_hour_usd: price,
            raw_cost: `$${price.toFixed(2)}`,
            class: "GPU",
            type: "Virtual Machine",
          });
        }
      }
    });

    return rows;
  }

  private normalizeGpuModel(name: string): string {
    let normalized = name
      .replace(/\bRTX\s+Pro\b/g, "RTX PRO")
      .replace(/\bPCIE\b/gi, "PCIe")
      .replace(/\s+/g, " ")
      .trim();

    if (!/^(NVIDIA|AMD)\b/i.test(normalized)) {
      normalized = `NVIDIA ${normalized}`;
    }

    return normalized;
  }
}

// Export a singleton instance
export const runpodScraper = new RunPodScraper();
