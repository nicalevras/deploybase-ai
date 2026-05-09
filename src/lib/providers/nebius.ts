import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { NebiusPriceRow, ProviderResult } from '@/types/pricing';
import type { ProviderScraper } from './types';
import { logger } from "@/lib/logger";

const PRICING_URL = 'https://nebius.com/prices';

const MONEY_RE = /\$([0-9.]+)/;

// VRAM mapping based on official NVIDIA specifications
// Source: NVIDIA product pages and datasheets
// Keys must match output of cleanGpuModelName() (without HGX prefix)
const VRAM_MAPPING: Record<string, number> = {
  'NVIDIA GB300 NVL72': 279,    // Current app convention: 4 GPUs = 1116 GB total
  'NVIDIA B300': 288,           // B300 convention used by existing scrapers
  'NVIDIA GB200 NVL72': 186,    // 372 GB HBM3e per superchip (2 GPUs) → 186 per GPU
  'NVIDIA B200': 192,           // Align with existing B200 convention in scraper data
  'NVIDIA H200': 141,           // H200 spec: 141 GB HBM3e
  'NVIDIA H100': 80,            // H100 spec: 80 GB HBM3
  'NVIDIA RTX PRO 6000': 96,    // RTX PRO 6000 Blackwell
  'NVIDIA L40S': 48,            // L40S spec: 48 GB GDDR6
};

function getVramGb(gpuModel: string): number | undefined {
  // Try exact match first
  if (VRAM_MAPPING[gpuModel]) {
    return VRAM_MAPPING[gpuModel];
  }
  // Try partial match for variations
  for (const [key, vram] of Object.entries(VRAM_MAPPING)) {
    if (gpuModel.includes(key) || key.includes(gpuModel)) {
      return vram;
    }
  }
  return undefined;
}

function parsePrice(text: string): number | undefined {
  const m = text.match(MONEY_RE);
  return m ? Number(m[1]) : undefined;
}

function cleanGpuModelName(item: string): string {
  // Remove asterisks
  let cleaned = item.replace(/\*/g, '');

  // Handle specific patterns for L40S GPUs - strip Intel/AMD suffixes
  cleaned = cleaned
    .replace(/\bNVIDIA L40S\s+with\s+(Intel|AMD)\s+CPU\b/gi, 'NVIDIA L40S')
    .replace(/NVIDIA L40S GPU with AMD/g, 'NVIDIA L40S')
    .replace(/NVIDIA L40S GPU with Intel/g, 'NVIDIA L40S')
    .replace(/\bNVIDIA L40S\s+(Intel|AMD)\b/gi, 'NVIDIA L40S')
    .replace(/\bHGX\s*/gi, '');  // Strip HGX prefix (e.g., "NVIDIA HGX B200" -> "NVIDIA B200")

  return cleaned.trim();
}

function cleanPriceText(text: string): string {
  const markdownLink = text.match(/^\[([^\]]+)\]\([^)]+\)$/);
  return (markdownLink ? markdownLink[1] : text).trim();
}

function getVariantSku(item: string): string | undefined {
  if (!/\bNVIDIA\s+L40S\b/i.test(item)) return undefined;
  if (/\bIntel\b/i.test(item)) return 'nvidia-l40s-intel';
  if (/\bAMD\b/i.test(item)) return 'nvidia-l40s-amd';
  return undefined;
}

function normalizeSpecValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const [firstSegment] = trimmed.split(/[-–—]/);
  return firstSegment.trim();
}

function parseSpecNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numeric = trimmed.replace(/[^\d.]/g, '');
  if (!numeric) return undefined;

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

class NebiusScraper implements ProviderScraper {
  name = 'nebius';
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
        throw new Error(`Failed to fetch Nebius pricing page: ${response.status}`);
      }

      const html = await response.text();
      const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse the HTML and extract pricing data from Next.js JSON
      const rows = this.parsePricingPage(html);

      return {
        provider: "nebius",
        rows,
        observedAt: new Date().toISOString(),
        sourceHash,
      };
    } catch (error) {
      throw new Error(`Nebius scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parsePricingPage(html: string): NebiusPriceRow[] {
    const rows: NebiusPriceRow[] = [];
    const observedAt = new Date().toISOString();

    // Extract pricing data from Next.js JSON
    const nextDataMatch = html.match(/id="__NEXT_DATA__"[^>]*>([^<]*)</);
    if (!nextDataMatch) {
      logger.warn('Could not find Next.js data');
      return rows;
    }

    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData.props?.pageProps;

      if (!pageProps) {
        logger.warn('Could not find page props in Next.js data');
        return rows;
      }

      // Extract pricing tables from the Apollo state
      const apolloState = pageProps.__APOLLO_STATE__;
      const pagesKey = Object.keys(apolloState).find(key => key.startsWith('pages:'));

      if (!pagesKey) {
        logger.warn('Could not find pages key in Apollo state');
        return rows;
      }

      const pageData = apolloState[pagesKey];
      if (!pageData.content) {
        logger.warn('Could not find content in page data');
        return rows;
      }

      const content = typeof pageData.content === 'string' ? JSON.parse(pageData.content) : pageData.content;
      if (!content.blocks) {
        logger.warn('Could not find blocks in content');
        return rows;
      }

      const blocks = content.blocks;

      for (const block of blocks) {
        if (block.type === 'highlight-table-block' && block.table?.content) {
          const tableContent = block.table.content;
          const title = block.title || '';

          if (title.includes('NVIDIA GPU Instances')) {
            const gpuRows = this.parseGpuTable(tableContent, observedAt);
            rows.push(...gpuRows);
          }
        }
      }
    } catch (error) {
      logger.warn('Error parsing Next.js data:', error);
    }

    return rows;
  }

  private parseGpuTable(tableContent: string[][], observedAt: string): NebiusPriceRow[] {
    const rows: NebiusPriceRow[] = [];

    // Skip header row (first row)
    for (let i = 1; i < tableContent.length; i++) {
      const row = tableContent[i];
      if (row.length < 4) continue; // Skip malformed rows

      const [item, vcpus, ramGb] = row;
      const priceText = cleanPriceText(row.length >= 5 ? row[4] : row[3]);
      const normalizedModel = cleanGpuModelName(item);
      const normalizedVcpus = normalizeSpecValue(vcpus);
      const normalizedRam = normalizeSpecValue(ramGb);
      const systemRamGb = parseSpecNumber(normalizedRam);

      const priceRow: NebiusPriceRow = {
        provider: 'nebius',
        source_url: PRICING_URL,
        observed_at: observedAt,
        item: normalizedModel,
        sku: getVariantSku(item),
        gpu_model: normalizedModel,
        class: 'GPU',
        gpu_count: 1,
        vram_gb: getVramGb(normalizedModel),
        vcpus: normalizedVcpus,
        system_ram_gb: systemRamGb,
        price_unit: 'gpu_hour',
        price_usd: parsePrice(priceText),
        raw_cost: priceText,
        type: 'Virtual Machine',
      };

      rows.push(priceRow);
    }

    return rows;
  }
}

// Export a singleton instance
export const nebiusScraper = new NebiusScraper();
