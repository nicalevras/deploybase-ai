import crypto from "crypto";
import { logger } from "@/lib/logger";
import type { ProviderResult, VerdaPriceRow } from "@/types/pricing";
import * as cheerio from "cheerio";
import type { ProviderScraper } from "./types";

const PRICING_URL = "https://verda.com/pricing";

class VerdaScraper implements ProviderScraper {
  name = "verda";
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = true;

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
        throw new Error(
          `Failed to fetch Verda pricing page: ${response.status}`,
        );
      }

      const html = await response.text();
      const sourceHash = crypto.createHash("sha256").update(html).digest("hex");

      const $ = cheerio.load(html);
      const rows = this.parseAllGpuTabs($);

      // Deduplicate by sku (instance name)
      const seenIds = new Set<string>();
      const uniqueRows = rows.filter((row) => {
        const key =
          row.sku || row.instance_id || `${row.gpu_model}-${row.gpu_count}`;
        if (seenIds.has(key)) {
          logger.info(`[VerdaScraper] Skipping duplicate: ${key}`);
          return false;
        }
        seenIds.add(key);
        return true;
      });

      logger.info(
        `[VerdaScraper] Parsed ${uniqueRows.length} GPU pricing rows`,
      );

      return {
        provider: "verda",
        rows: uniqueRows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(
        `Verda scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Dynamically discover and parse all GPU tabs.
   * Skips CPU-only tabs.
   */
  private parseAllGpuTabs($: cheerio.CheerioAPI): VerdaPriceRow[] {
    const rows: VerdaPriceRow[] = [];
    const observedAt = new Date().toISOString();

    $("table").each((_: number, table: any) => {
      const $table = $(table);

      const headerText = $table
        .find("thead, tr:first-child")
        .text()
        .toLowerCase();
      if (!headerText.includes("gpu") && !headerText.includes("vram")) {
        return;
      }

      $table.find("tbody tr, tr").each((__: number, row: any) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length < 3) return;

        const parsedRow =
          this.parseCurrentTableRow($, cells, observedAt) ||
          this.parseTableRow($, cells, observedAt);
        if (parsedRow) {
          rows.push(parsedRow);
        }
      });
    });

    // Also look for card-based or div-based pricing structures
    // Verda may use tabs with pricing info in structured elements
    this.parseTabContent($, rows, observedAt);

    return rows;
  }

  /**
   * Parse tab-structured content for GPU pricing
   */
  private parseTabContent(
    $: cheerio.CheerioAPI,
    rows: VerdaPriceRow[],
    observedAt: string,
  ): void {
    // Look for tab panels or sections with GPU pricing
    $('[role="tabpanel"], .tab-content, [data-tab]').each(
      (_: number, panel: any) => {
        const $panel = $(panel);

        // Find pricing rows within the panel
        $panel
          .find('tr, .pricing-row, [class*="row"]')
          .each((__: number, row: any) => {
            const $row = $(row);

            // Look for instance name pattern (e.g., 8H100.80S.176V)
            const rowText = $row.text();
            const instanceMatch = rowText.match(/(\d+[A-Z]\d+[A-Za-z0-9.]+)/);
            if (!instanceMatch) return;

            const instanceName = instanceMatch[1];
            const gpuInfo = this.parseInstanceName(instanceName);
            if (!gpuInfo) return;

            // Look for price pattern (e.g., $2.29/h or $2.29)
            const priceMatch =
              rowText.match(/\$?([\d.]+)\/h/i) || rowText.match(/\$([\d.]+)/);
            if (!priceMatch) return;

            const priceHourUsd = parseFloat(priceMatch[1]);
            if (isNaN(priceHourUsd) || priceHourUsd === 0) return;

            // Extract specs if available
            const specs = this.extractSpecs($row, rowText);

            const existingRow = rows.find((r) => r.sku === instanceName);
            if (existingRow) return; // Skip duplicates

            rows.push({
              provider: "verda",
              source_url: PRICING_URL,
              observed_at: observedAt,
              instance_id: instanceName,
              sku: instanceName,
              gpu_model: gpuInfo.model,
              gpu_count: gpuInfo.count,
              vram_gb: specs.vram ?? gpuInfo.vram,
              vcpus: specs.vcpus,
              system_ram_gb: specs.ram,
              price_unit: "instance_hour",
              price_hour_usd: priceHourUsd,
              raw_cost: `$${priceHourUsd}/h`,
              class: "GPU",
              type: "Virtual Machine",
            });
          });
      },
    );
  }

  /**
   * Parse a table row into a VerdaPriceRow
   * GPU table columns: [GPU model, Instance name, CPU, RAM, VRAM, Price]
   * CPU table columns: [CPU model, Instance name, CPU, RAM, Price] - skip these
   */
  private parseTableRow(
    $: cheerio.CheerioAPI,
    cells: cheerio.Cheerio<any>,
    observedAt: string,
  ): VerdaPriceRow | null {
    const cellTexts = cells
      .map((_: number, cell: any) => $(cell).text().trim())
      .get();

    // GPU tables have 6 columns, CPU tables have 5 - skip CPU tables
    if (cellTexts.length < 6) return null;

    // Column positions for GPU tables:
    // [0] GPU model (e.g., "8x A100 SXM4")
    // [1] Instance name (e.g., "8A100.176V")
    // [2] CPU (vCPUs)
    // [3] RAM (GB)
    // [4] VRAM (GB)
    // [5] Price (e.g., "$10.32/h")

    const gpuModelCell = cellTexts[0];
    const instanceName = cellTexts[1];
    const cpuValue = cellTexts[2];
    const ramValue = cellTexts[3];
    const vramValue = cellTexts[4];
    const priceValue = cellTexts[5];

    // Validate instance name pattern
    if (!instanceName || !/\d+[A-Z]/i.test(instanceName)) return null;

    // Parse GPU count from first column (e.g., "8x" from "8x A100 SXM4")
    const countMatch = gpuModelCell.match(/^(\d+)x/i);
    const gpuCount = countMatch ? parseInt(countMatch[1]) : 1;

    // Parse GPU model from first column (remove count prefix)
    const gpuModelText = gpuModelCell.replace(/^\d+x\s*/i, "").trim();
    const gpuModel = this.normalizeGpuModel(gpuModelText);

    // Parse CPU (vCPUs)
    const vcpus = this.parseNumber(cpuValue);

    // Parse RAM (GB)
    const systemRamGb = this.parseNumber(ramValue);

    // Parse VRAM (GB) - total for all GPUs (this is what the website shows)
    const vramGb = this.parseNumber(vramValue);

    // Parse price (e.g., "$10.32/h")
    const priceMatch = priceValue.match(/\$?([\d.]+)/);
    const priceHourUsd = priceMatch ? parseFloat(priceMatch[1]) : 0;

    if (priceHourUsd === 0) return null;

    return {
      provider: "verda",
      source_url: PRICING_URL,
      observed_at: observedAt,
      instance_id: instanceName,
      sku: instanceName,
      gpu_model: gpuModel,
      gpu_count: gpuCount,
      vram_gb: vramGb, // Total VRAM for instance (not per-GPU)
      vcpus: vcpus,
      system_ram_gb: systemRamGb,
      price_unit: "instance_hour",
      price_hour_usd: priceHourUsd,
      raw_cost: priceValue,
      class: "GPU",
      type: "Virtual Machine",
    };
  }

  /**
   * Current pricing table columns:
   * Hardware, CPUs, RAM, GPU VRAM, Price, Spot price
   */
  private parseCurrentTableRow(
    $: cheerio.CheerioAPI,
    cells: cheerio.Cheerio<any>,
    observedAt: string,
  ): VerdaPriceRow | null {
    const cellTexts = cells
      .map((_: number, cell: any) => $(cell).text().replace(/\s+/g, " ").trim())
      .get();
    if (cellTexts.length < 5) return null;

    const [hardware, cpuValue, ramValue, vramValue, priceValue] = cellTexts;
    if (!hardware || !/^\d+x\s+/i.test(hardware)) return null;
    if (/AMD EPYC|CPU\./i.test(hardware)) return null;

    const countMatch = hardware.match(/^(\d+)x\s+/i);
    const gpuCount = countMatch ? parseInt(countMatch[1], 10) : 1;

    const priceMatch = priceValue.match(/\$([\d.]+)\/h/i);
    if (!priceMatch) return null;

    const priceHourUsd = parseFloat(priceMatch[1]);
    if (!priceHourUsd || isNaN(priceHourUsd)) return null;

    const gpuModel = this.normalizeGpuModel(
      hardware
        .replace(/^\d+x\s+/i, "")
        .replace(/\s+\d+\s*GB$/i, "")
        .trim(),
    );
    const vcpus = this.parseNumber(cpuValue);
    const systemRamGb = this.parseNumber(ramValue);
    const vramGb = this.parseNumber(vramValue);
    const instanceId = this.slugify(
      `${gpuCount}x-${gpuModel}-${vcpus || ""}v-${systemRamGb || ""}gb`,
    );

    return {
      provider: "verda",
      source_url: PRICING_URL,
      observed_at: observedAt,
      instance_id: instanceId,
      sku: instanceId,
      gpu_model: gpuModel,
      gpu_count: gpuCount,
      vram_gb: vramGb,
      vcpus,
      system_ram_gb: systemRamGb,
      price_unit: "instance_hour",
      price_hour_usd: priceHourUsd,
      raw_cost: priceValue,
      class: "GPU",
      type: "Virtual Machine",
    };
  }

  /**
   * Normalize GPU model name to standard format
   */
  private normalizeGpuModel(model: string): string {
    // Remove extra whitespace and normalize
    const cleanModel = model
      .replace(/\bRTX\s+PRO\s+6000\s+Blackwell\s+SE\b/i, "RTX PRO 6000 SE")
      .replace(/\s+/g, " ")
      .trim();

    // Add NVIDIA prefix if not present
    if (!cleanModel.toLowerCase().startsWith("nvidia")) {
      return `NVIDIA ${cleanModel}`;
    }
    return cleanModel;
  }

  /**
   * Parse a number from text, handling various formats
   */
  private parseNumber(text: string): number | undefined {
    const match = text.match(/^\s*(\d+)\s*/);
    return match ? parseInt(match[1]) : undefined;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Parse instance name to extract GPU info
   * e.g., "8H100.80S.176V" -> { model: "NVIDIA H100 SXM5", count: 8, vram: 80 }
   */
  private parseInstanceName(
    name: string,
  ): { model: string; count: number; vram?: number } | null {
    // Pattern: [count][GPU][specs]
    // Examples: 8H100.80S.176V, 1A100.22V, 8B200.240V
    const match = name.match(/^(\d+)([A-Z]+\d*)/i);
    if (!match) return null;

    const count = parseInt(match[1]);
    const gpuCode = match[2].toUpperCase();

    // Map GPU codes to full model names
    const gpuModelMap: Record<string, string> = {
      B300: "NVIDIA B300 SXM6",
      B200: "NVIDIA B200 SXM6",
      H200: "NVIDIA H200 SXM5",
      H100: "NVIDIA H100 SXM5",
      A100: "NVIDIA A100 SXM4",
      RTXPRO6000: "NVIDIA RTX PRO 6000",
      L40S: "NVIDIA L40S",
      RTX6000ADA: "NVIDIA RTX 6000 ADA",
      A6000: "NVIDIA RTX A6000",
      V100: "NVIDIA Tesla V100",
    };

    // Try to match known GPU models
    let model = "Unknown GPU";
    for (const [code, fullName] of Object.entries(gpuModelMap)) {
      if (gpuCode.includes(code) || code.includes(gpuCode)) {
        model = fullName;
        break;
      }
    }

    // If still unknown, construct a reasonable name
    if (model === "Unknown GPU") {
      model = `NVIDIA ${gpuCode}`;
    }

    // Extract VRAM from name if present (e.g., 80S means 80GB)
    const vramMatch = name.match(/\.(\d+)S\./i) || name.match(/\.(\d+)S$/i);
    const vram = vramMatch ? parseInt(vramMatch[1]) : undefined;

    return { model, count, vram };
  }

  /**
   * Extract specs from row text
   */
  private extractSpecs(
    $row: cheerio.Cheerio<any>,
    text: string,
  ): { vcpus?: number; ram?: number; vram?: number } {
    const specs: { vcpus?: number; ram?: number; vram?: number } = {};

    // Look for patterns in text
    const vcpuMatch = text.match(/(\d+)\s*vCPU/i);
    if (vcpuMatch) specs.vcpus = parseInt(vcpuMatch[1]);

    const ramMatch = text.match(/(\d+)\s*GB\s*RAM/i);
    if (ramMatch) specs.ram = parseInt(ramMatch[1]);

    const vramMatch = text.match(/(\d+)\s*GB\s*VRAM/i);
    if (vramMatch) specs.vram = parseInt(vramMatch[1]);

    return specs;
  }
}

export const verdaScraper = new VerdaScraper();
