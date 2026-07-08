import { CATEGORIES } from "@/lib/article-categories";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/articles-loader";
import { toGpuModelSlug } from "@/lib/gpu-model-slug";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { logger } from "@/lib/logger";
import { modelsCache } from "@/lib/models-cache";
import { NextResponse } from "next/server";

export const revalidate = 43200;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deploybase.ai";

const GPU_DISPLAY_NAMES: Record<string, string> = {
  coreweave: "CoreWeave",
  openai: "OpenAI",
  runpod: "RunPod",
  lambda: "Lambda",
  hyperstack: "Hyperstack",
  nebius: "Nebius",
  vast: "Vast.ai",
  crusoe: "Crusoe",
  latitude: "Latitude",
  oblivus: "Oblivus",
  sesterce: "Sesterce",
  thundercompute: "ThunderCompute",
  paperspace: "Paperspace",
  togetherai: "Together AI",
  fluidstack: "FluidStack",
  tensordock: "TensorDock",
  datacrunch: "DataCrunch",
  vultr: "Vultr",
  ovhcloud: "OVHcloud",
  scaleway: "Scaleway",
  massedcompute: "Massed Compute",
  jarvis: "Jarvis Labs",
  voltagepark: "Voltage Park",
  aws: "AWS",
  gcp: "Google Cloud",
  googlecloud: "Google Cloud",
  azure: "Microsoft Azure",
  digitalocean: "DigitalOcean",
  flyio: "Fly.io",
  hotaisle: "Hot Aisle",
  alibaba: "Alibaba Cloud",
  oracle: "Oracle Cloud",
};

function formatGpuProvider(slug: string): string {
  return (
    GPU_DISPLAY_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
  );
}

export async function GET() {
  const lines: string[] = [
    "# Deploybase: AI Infrastructure Pricing Index",
    "",
    "> Deploybase is an AI infrastructure pricing index for GPU cloud pricing, LLM API pricing, provider specs, availability, performance stats, and pricing history. Deploybase tracks pricing data across major GPU cloud, inference, and AI infrastructure providers to help engineers compare compute costs.",
    "",
    "## Primary Deploybase Resources",
    "",
    `- [Deploybase GPU Pricing Index](${SITE_URL}/gpus): Deploybase GPU cloud pricing comparison with hourly rates, VRAM, specs, provider availability, and pricing history.`,
    `- [Deploybase LLM API Pricing Index](${SITE_URL}/llms): Deploybase LLM API pricing comparison with cost per token, context windows, model availability, and provider coverage.`,
    `- [Deploybase MLOps Tools Directory](${SITE_URL}/tools): Deploybase directory of MLOps tools for training, inference, deployment, monitoring, and AI infrastructure workflows.`,
    "",
  ];

  // GPU providers
  try {
    const gpuFacets = await gpuPricingCache.getGpusFacets();
    const gpuProviders = gpuFacets.provider.rows;

    if (gpuProviders.length) {
      lines.push("## GPU Providers", "");
      for (const row of gpuProviders) {
        const slug = row.value;
        const name = formatGpuProvider(slug);
        lines.push(
          `- [${name} GPU Pricing](${SITE_URL}/gpus/${encodeURIComponent(slug)}): ${name} GPU pricing with hourly rates, specs, and availability.`,
        );
      }
      lines.push("");
    }

    const gpuModels = gpuFacets.gpu_model.rows;
    if (gpuModels.length) {
      lines.push("## GPU Models", "");
      for (const row of gpuModels) {
        const name = row.value;
        const slug = toGpuModelSlug(name);
        lines.push(
          `- [${name} Pricing](${SITE_URL}/gpus/models/${slug}): Compare ${name} pricing across all cloud providers.`,
        );
      }
      lines.push("");
    }
  } catch (error) {
    logger.error("[llms.txt] Failed to fetch GPU providers", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // LLM providers
  try {
    const llmProviders = await modelsCache.getAvailableProviders();

    if (llmProviders.length) {
      lines.push("## LLM Providers", "");
      for (const provider of llmProviders) {
        lines.push(
          `- [${provider} API Pricing](${SITE_URL}/llms/${encodeURIComponent(provider)}): ${provider} API pricing with cost per token across all models.`,
        );
      }
      lines.push("");
    }
  } catch (error) {
    logger.error("[llms.txt] Failed to fetch LLM providers", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Article Categories
  lines.push("## Article Categories", "");
  for (const cat of CATEGORIES) {
    lines.push(
      `- [${cat.name} Articles](${SITE_URL}/articles/category/${cat.slug}): ${cat.description}`,
    );
  }
  lines.push("");

  // Articles
  try {
    const slugs = getAllArticleSlugs();
    if (slugs.length) {
      lines.push("## Articles", "");
      for (const slug of slugs) {
        const article = getArticleBySlug(slug);
        if (!article) continue;
        const { title, description } = article.frontmatter;
        const desc = description || title;
        lines.push(`- [${title}](${SITE_URL}/articles/${slug}): ${desc}`);
      }
      lines.push("");
    }
  } catch (error) {
    logger.error("[llms.txt] Failed to read articles", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=43200, s-maxage=43200",
    },
  });
}
