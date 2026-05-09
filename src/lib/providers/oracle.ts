import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { OraclePriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';
import { logger } from "@/lib/logger";

const PRICING_URL = 'https://www.oracle.com/cloud/price-list/';


// Oracle GPU pricing per GPU (from internal pricing table)
// For multi-GPU instances, multiply by gpu_count to get total instance price
const ORACLE_GPU_PRICING: Record<string, number> = {
  // Large scale-out AI training, data analytics, and HPC
  'BM.GPU.B200.8': 14.00,      // 8x GPUs = $112.00 total
  'BM.GPU.GB200.4': 16.00,     // 4x GPUs = $64.00 total
  'BM.GPU.GB300.4': 18.00,     // 4x GPUs = $72.00 total (NVIDIA B300)
  'BM.GPU.H200.8': 10.00,      // 8x GPUs = $80.00 total
  'BM.GPU.H100.8': 10.00,      // 8x GPUs = $80.00 total
  'BM.GPU.MI300X.8': 6.00,     // 8x GPUs = $48.00 total
  'BM.GPU.MI355X.8': 8.60,     // 8x GPUs = $68.80 total (AMD MI355X)
  'BM.GPU.A100-v2.8': 4.00,    // 8x GPUs = $32.00 total
  'BM.GPU.L40S.4': 3.50,       // 4x GPUs = $14.00 total
  'BM.GPU4.8': 3.05,           // 8x GPUs = $24.40 total

  // Small AI training, inference, streaming, gaming, and virtual desktop infrastructure
  'VM.GPU.A10.1': 2.00,        // 1x GPU = $2.00 total
  'VM.GPU.A10.2': 2.00,        // 2x GPUs = $4.00 total
  'BM.GPU.A10.4': 2.00,        // 4x GPUs = $8.00 total
  'VM.GPU3.1': 2.95,           // 1x GPU = $2.95 total
  'VM.GPU3.2': 2.95,           // 2x GPUs = $5.90 total
  'VM.GPU3.4': 2.95,           // 4x GPUs = $11.80 total
  'BM.GPU3.8': 2.95,           // 8x GPUs = $23.60 total
  'VM.GPU2.1': 1.275,          // 1x GPU = $1.275 total
  'BM.GPU2.2': 1.275,          // 2x GPUs = $2.55 total
};

const ORACLE_FALLBACK_VRAM_PER_GPU: Record<string, number> = {
  'NVIDIA A10': 24,
  'NVIDIA Tesla V100': 16,
  'NVIDIA Tesla P100': 16,
};

function normalizeOracleShape(shape: string): string {
  let normalized = shape
    .replace(/\s*\(new\)\s*$/i, '')
    .replace(/\s+/g, '')
    .trim();

  // Oracle renders footnote superscripts as trailing digits in textContent.
  normalized = normalized.replace(/^(BM\.GPU\.GB(?:200|300)\.4)\d+$/, '$1');

  return normalized;
}

function normalizeOracleGpuInfo(shape: string, gpuInfo: string): { model: string; count: number; vramGb: number } | null {
  const gpuMatch = gpuInfo.match(/^(\d+)\s*x\s+(.+)$/i);
  if (!gpuMatch) return null;

  const count = Number(gpuMatch[1]);
  if (!Number.isFinite(count) || count <= 0) return null;

  const rawModel = gpuMatch[2].trim();
  const vramMatch = rawModel.match(/(\d+)\s*GB/i);
  const vramPerGpu = vramMatch ? Number(vramMatch[1]) : undefined;

  let model = rawModel
    .replace(/\s+\d+\s*GB\b.*$/i, '')
    .replace(/\s+Tensor Core.*$/i, '')
    .replace(/\s+Matrix Core.*$/i, '')
    .replace(/^Nvidia\b/i, 'NVIDIA')
    .replace(/^NVIDIA\s+P100\b/i, 'NVIDIA Tesla P100')
    .replace(/^NVIDIA\s+V100\b/i, 'NVIDIA Tesla V100')
    .replace(/\s+/g, ' ')
    .trim();

  if (shape.startsWith('BM.GPU.GB200.')) {
    model = 'NVIDIA GB200 NVL72';
  } else if (shape.startsWith('BM.GPU.GB300.')) {
    model = 'NVIDIA GB300 NVL72';
  } else if (/^NVIDIA\s+RTX\s+PRO\s+6000$/i.test(model)) {
    model = 'NVIDIA RTX PRO 6000';
  }

  const fallbackVramPerGpu = ORACLE_FALLBACK_VRAM_PER_GPU[model];
  const resolvedVramPerGpu = vramPerGpu ?? fallbackVramPerGpu;
  if (!resolvedVramPerGpu) return null;

  return {
    model,
    count,
    vramGb: resolvedVramPerGpu * count,
  };
}

class OracleScraper implements ProviderScraper {
  name = 'oracle';
  url = PRICING_URL;
  scrapeIntervalMinutes = 1440;
  enabled = true;

  async scrape(): Promise<ProviderResult> {
    try {
      // Fetch the pricing page with proper browser headers
      const response = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Oracle pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data
      const rows = this.parsePricingPage(html);

      return {
        provider: "oracle",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Oracle scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): OraclePriceRow[] {
    const rows: OraclePriceRow[] = [];
    const observedAt = new Date().toISOString();

    const $ = cheerio.load(html);

    // Find the GPU - Accelerated Compute table under the Compute section.
    const gpuSection = $('#compute-gpu').closest('.rc34w3');
    const gpuTable = gpuSection.find('table').first();

    if (gpuTable.length === 0) {
      logger.warn('Could not find Oracle GPU instances table');
      return rows;
    }

    // Parse table rows (skip header)
    gpuTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');

      if (cells.length < 2) {
        return; // Skip malformed rows
      }

      // Current columns: Shape, GPUs, Architecture, Network, GPU price per hour.
      const shape = normalizeOracleShape($(cells[0]).find('div').first().text().trim() || $(cells[0]).text().trim());
      const gpuInfo = $(cells[1]).find('div').first().text().trim();

      const architecture = cells.length >= 3 ? ($(cells[2]).find('div').first().text().trim() || $(cells[2]).text().trim()) : '';
      const network = cells.length >= 4 ? ($(cells[3]).find('div').first().text().trim() || $(cells[3]).text().trim()) : '';

      if (!shape || !gpuInfo) {
        return; // Skip rows without essential data
      }

      const gpuDetails = normalizeOracleGpuInfo(shape, gpuInfo);
      if (!gpuDetails) {
        logger.warn(`Skipping Oracle GPU ${shape}: could not parse GPU details`);
        return;
      }

      // Get pricing from the manual mapping (per GPU pricing)
      let rawCost = 'Contact Oracle for pricing';
      let priceHourUsd: number | undefined;

      const perGpuPrice = ORACLE_GPU_PRICING[shape];
      if (perGpuPrice !== undefined) {
        priceHourUsd = perGpuPrice * gpuDetails.count; // Multiply by GPU count for total instance price
        rawCost = `$${priceHourUsd.toFixed(2)}`;
      }

      const priceRow: OraclePriceRow = {
        provider: 'oracle',
        source_url: PRICING_URL,
        observed_at: observedAt,
        instance_id: shape,
        gpu_model: gpuDetails.model,
        gpu_count: gpuDetails.count,
        vram_gb: gpuDetails.vramGb,
        storage: 'Not specified',
        network: network || 'Not specified',
        architecture: architecture || 'Not specified',
        interconnect: network || 'Not specified',
        price_unit: 'instance_hour',
        raw_cost: rawCost,
        class: 'GPU',
        type: shape.startsWith('BM') ? 'Bare Metal' : shape.startsWith('VM') ? 'Virtual Machine' : undefined,
      };

      if (priceHourUsd !== undefined) {
        priceRow.price_hour_usd = priceHourUsd;
      }

      rows.push(priceRow);

      // Intentionally no logger here to reduce noise in production logs
    });

    return rows;
  }
}

// Export a singleton instance
export const oracleScraper = new OracleScraper();
