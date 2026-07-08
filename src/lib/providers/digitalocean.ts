import crypto from "crypto";
import { logger } from "@/lib/logger";
import type { DigitalOceanPriceRow, ProviderResult } from "@/types/pricing";
import * as cheerio from "cheerio";
import type { ProviderScraper } from "./types";

const PRICING_URL = "https://www.digitalocean.com/pricing/gpu-droplets";

// Interface for the __NEXT_DATA__ JSON structure
interface DOGpuPlan {
  description: string; // e.g., "NVIDIA HGX H100×8" or "AMD Instinct™ MI300X"
  slug: string; // e.g., "gpu-h100x8-640gb"
  cpus: number; // vCPUs
  memory: number; // System RAM in GB
  disk: {
    boot: number; // Boot disk in GB
    scratch?: number; // Scratch disk in GB (optional)
  };
  price: {
    hourly: number; // Price per hour
    monthly?: number; // Monthly price (if available)
  };
  gpu: {
    memory: number; // Total VRAM in GB
    variant?: number; // GPU count (1 if not specified, 8 for multi-GPU)
  };
}

interface DONextData {
  props: {
    pageProps: {
      data: {
        plans: DOGpuPlan[];
      };
    };
  };
}

class DigitalOceanScraper implements ProviderScraper {
  name = "digitalocean";
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
          `Failed to fetch DigitalOcean pricing page: ${response.status}`,
        );
      }

      const html = await response.text();
      const sourceHash = crypto.createHash("sha256").update(html).digest("hex");

      // Parse the HTML and extract pricing data from __NEXT_DATA__ JSON
      const rows = this.parsePricingPage(html);

      return {
        provider: "digitalocean",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(
        `DigitalOcean scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private parsePricingPage(html: string): DigitalOceanPriceRow[] {
    const rows: DigitalOceanPriceRow[] = [];
    const observedAt = new Date().toISOString();
    const $ = cheerio.load(html);

    // Extract __NEXT_DATA__ JSON from the page
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/,
    );
    if (!nextDataMatch) {
      return this.parsePricingCards($, observedAt);
    }

    let nextData: DONextData;
    try {
      nextData = JSON.parse(nextDataMatch[1]);
    } catch (e) {
      logger.warn("Failed to parse __NEXT_DATA__ JSON:", e);
      return rows;
    }

    const plans = nextData.props?.pageProps?.data?.plans;
    if (!Array.isArray(plans)) {
      logger.warn("No plans array found in __NEXT_DATA__");
      return rows;
    }

    for (const plan of plans) {
      // Skip if missing essential data
      if (!plan.description || !plan.price?.hourly || !plan.gpu?.memory) {
        continue;
      }

      // Parse GPU model name from description
      // e.g., "NVIDIA HGX H100×8" -> "NVIDIA H100"
      // e.g., "AMD Instinct™ MI300X" -> "AMD MI300X"
      let gpuModel = plan.description
        .replace(/×\d+$/, "") // Remove ×8 suffix
        .replace(/™/g, "") // Remove trademark symbol
        .replace(/Instinct\s+/i, "") // Remove "Instinct" from AMD names
        .replace(/\bHGX\s*/gi, "") // Strip HGX prefix (e.g., "NVIDIA HGX H100" -> "NVIDIA H100")
        .replace(/\s+Ada\s+Generation\b/gi, " Ada") // "RTX 4000 Ada Generation" -> "RTX 4000 Ada"
        .trim();

      // GPU count: use variant if specified, otherwise 1
      const gpuCount = plan.gpu.variant || 1;

      // Build storage description
      const storageParts: string[] = [];
      if (plan.disk?.boot) {
        storageParts.push(
          `Boot: ${plan.disk.boot >= 1000 ? (plan.disk.boot / 1000).toFixed(1) + " TB" : plan.disk.boot + " GB"}`,
        );
      }
      if (plan.disk?.scratch) {
        storageParts.push(
          `Scratch: ${plan.disk.scratch >= 1000 ? (plan.disk.scratch / 1000).toFixed(1) + " TB" : plan.disk.scratch + " GB"}`,
        );
      }
      const storage = storageParts.join(", ") || "Unknown";

      rows.push({
        provider: "digitalocean",
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: plan.slug,
        gpu_model: gpuModel,
        gpu_count: gpuCount,
        vram_gb: plan.gpu.memory,
        vcpus: plan.cpus,
        system_ram_gb: plan.memory,
        storage: storage,
        price_unit: gpuCount === 1 ? "gpu_hour" : "instance_hour",
        price_hour_usd: plan.price.hourly,
        raw_cost: `$${plan.price.hourly.toFixed(2)}/hr`,
        class: "GPU",
        type: "Virtual Machine",
      });
    }

    return rows;
  }

  private parsePricingCards(
    $: cheerio.CheerioAPI,
    observedAt: string,
  ): DigitalOceanPriceRow[] {
    const rows: DigitalOceanPriceRow[] = [];
    const seen = new Set<string>();

    $("h3").each((_, heading) => {
      const title = $(heading).text().replace(/\s+/g, " ").trim();
      if (!/^(NVIDIA|AMD)\b/i.test(title)) return;

      const $card = $(heading).closest(
        '[class*="CardPricingstyles__StyledCardPricingCard"]',
      );
      const cardText = $card.text().replace(/\s+/g, " ").trim();

      // Keep on-demand droplet cards only. Reserved cards have a different shape.
      if (!cardText.includes("On-Demand Price")) return;

      const priceMatch = cardText.match(/\$([\d.]+)\s*\/GPU\/hour/i);
      const vramMatch = cardText.match(/GPU Memory\s*([\d,]+)\s*GB/i);
      const ramMatch = cardText.match(/Droplet Memory\s*([\d,]+)\s*GiB/i);
      const vcpuMatch = cardText.match(/Droplet vCPUs\s*([\d,]+)/i);
      const bootMatch = cardText.match(
        /Boot Disk\s*([\d.]+)\s*(TiB|GiB)\s*NVMe/i,
      );
      const scratchMatch = cardText.match(
        /Scratch Disk\s*([\d.]+)\s*(TiB|GiB)\s*NVMe/i,
      );
      const transferMatch = cardText.match(/Transfer\s*([\d,]+)\s*GiB/i);

      if (!priceMatch || !vramMatch || !ramMatch || !vcpuMatch) return;

      const pricePerGpu = parseFloat(priceMatch[1]);
      const vramGb = this.parseNumber(vramMatch[1]);
      const ramGb = this.parseNumber(ramMatch[1]);
      const vcpus = this.parseNumber(vcpuMatch[1]);
      const gpuCount = this.parseGpuCount(cardText);
      const gpuModel = this.normalizeGpuModel(title);
      const instanceId = this.slugify(`${gpuModel}-${gpuCount}x`);

      if (seen.has(instanceId)) return;
      seen.add(instanceId);

      const storageParts: string[] = [];
      if (bootMatch) storageParts.push(`Boot: ${bootMatch[1]} ${bootMatch[2]}`);
      if (scratchMatch)
        storageParts.push(`Scratch: ${scratchMatch[1]} ${scratchMatch[2]}`);

      rows.push({
        provider: "digitalocean",
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: instanceId,
        gpu_model: gpuModel,
        gpu_count: gpuCount,
        vram_gb: vramGb,
        vcpus,
        system_ram_gb: ramGb,
        storage: storageParts.join(", ") || "Unknown",
        transfer_gb: transferMatch
          ? this.parseNumber(transferMatch[1])
          : undefined,
        price_unit: "gpu_hour",
        price_hour_usd: pricePerGpu,
        raw_cost: `$${pricePerGpu.toFixed(2)}/GPU/hour`,
        class: "GPU",
        type: "Virtual Machine",
      });
    });

    if (rows.length === 0) {
      logger.warn(
        "Could not find __NEXT_DATA__ or current pricing cards in DigitalOcean page",
      );
    }

    return rows;
  }

  private parseGpuCount(text: string): number {
    const exactMatch = text.match(/GPUs per Droplet\s*(\d+)/i);
    if (exactMatch) return parseInt(exactMatch[1], 10);

    // Some cards say "Choose between 1 or 8"; prices are per GPU, so store the
    // one-GPU shape rather than inventing unlisted aggregate droplet specs.
    return 1;
  }

  private parseNumber(value: string): number {
    return parseFloat(value.replace(/,/g, ""));
  }

  private normalizeGpuModel(name: string): string {
    return name
      .replace(/×\d+$/i, "")
      .replace(/™/g, "")
      .replace(/\bInstinct\s+/i, "")
      .replace(/\bHGX\s+/gi, "")
      .replace(/\s+Ada\s+Generation\b/gi, " Ada")
      .replace(/\s+/g, " ")
      .trim();
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}

// Export a singleton instance
export const digitaloceanScraper = new DigitalOceanScraper();
