export interface ArticleCategory {
  slug: string;
  name: string;
  description: string;
}

export const CATEGORIES: ArticleCategory[] = [
  {
    slug: "gpu-pricing",
    name: "GPU Pricing",
    description:
      "GPU cloud pricing guides, provider-specific pricing breakdowns, and cost comparisons.",
  },
  {
    slug: "gpu-comparison",
    name: "GPU Comparison",
    description:
      "GPU vs GPU specs, benchmarks, performance comparisons, and hardware selection guides.",
  },
  {
    slug: "gpu-cloud",
    name: "GPU Cloud",
    description:
      "Cloud provider reviews, alternatives, GPU cloud guides, and provider comparisons.",
  },
  {
    slug: "llm-pricing",
    name: "LLM Pricing",
    description:
      "LLM API pricing breakdowns, cost-per-token comparisons, and budget guides.",
  },
  {
    slug: "model-comparison",
    name: "Model Comparison",
    description:
      "LLM model comparisons, benchmark analysis, and AI model selection guides.",
  },
  {
    slug: "ai-infrastructure",
    name: "AI Infrastructure",
    description:
      "AI infrastructure guides, MLOps pipelines, deployment architecture, and cost analysis.",
  },
  {
    slug: "ai-tools",
    name: "AI Tools",
    description:
      "Developer tools, MLOps platforms, AI frameworks, and tool comparison directories.",
  },
  {
    slug: "llm-guides",
    name: "LLM Guides",
    description:
      "How to run, deploy, fine-tune, and self-host LLMs. Open-source model guides.",
  },
  {
    slug: "tutorials",
    name: "Tutorials",
    description:
      "Step-by-step tutorials, beginner guides, and educational content for AI infrastructure.",
  },
  {
    slug: "market-analysis",
    name: "Market Analysis",
    description:
      "GPU and AI market trends, forecasts, industry analysis, and pricing outlook.",
  },
];

/**
 * Maps old/inconsistent category values to canonical slugs.
 * Keys are lowercased for case-insensitive matching.
 */
const CATEGORY_MAP: Record<string, string> = {
  // GPU Pricing
  "gpu pricing": "gpu-pricing",
  "pricing guide": "gpu-pricing",
  "pricing guides": "gpu-pricing",
  "price guide": "gpu-pricing",
  "price guides": "gpu-pricing",
  "pricing tools": "gpu-pricing",

  // GPU Comparison
  "gpu comparison": "gpu-comparison",
  "hardware comparison": "gpu-comparison",
  "gpu cloud comparison": "gpu-comparison",
  "accelerator comparison": "gpu-comparison",
  "gpu benchmarks": "gpu-comparison",
  "gpu hardware": "gpu-comparison",
  "gpu technology": "gpu-comparison",

  // GPU Cloud
  "gpu cloud": "gpu-cloud",
  "gpu providers": "gpu-cloud",
  "gpu infrastructure": "gpu-cloud",
  "gpu cloud providers": "gpu-cloud",
  "provider guides": "gpu-cloud",
  gpus: "gpu-cloud",
  gpu: "gpu-cloud",
  "gpu guides": "gpu-cloud",
  "gpu guide": "gpu-cloud",
  "gpu deployment": "gpu-cloud",
  "gpu ranking": "gpu-cloud",
  "cloud platforms": "gpu-cloud",
  "cloud infrastructure": "gpu-cloud",
  "cloud comparison": "gpu-cloud",
  "serverless computing": "gpu-cloud",

  // LLM Pricing
  "llm pricing": "llm-pricing",
  "api pricing": "llm-pricing",
  "llm pricing guide": "llm-pricing",
  "pricing analysis": "llm-pricing",
  "pricing comparison": "llm-pricing",
  pricing: "llm-pricing",
  "ai pricing": "llm-pricing",
  "ai model pricing": "llm-pricing",
  "llm api comparison": "llm-pricing",
  "api comparison": "llm-pricing",
  "ai cost guide": "llm-pricing",
  "cost optimization": "llm-pricing",
  "infrastructure cost": "llm-pricing",

  // Model Comparison
  "model comparison": "model-comparison",
  "model comparisons": "model-comparison",
  "llm comparison": "model-comparison",
  "ai model comparison": "model-comparison",
  comparison: "model-comparison",
  comparisons: "model-comparison",
  "vs comparison": "model-comparison",
  "ai comparison": "model-comparison",
  "ai code editor comparison": "model-comparison",
  "code tools comparison": "model-comparison",
  "developer tools comparison": "model-comparison",
  "tool comparison": "model-comparison",
  "ai tools comparison": "model-comparison",
  "ai platform comparison": "model-comparison",
  "llm framework comparison": "model-comparison",

  // AI Infrastructure
  "ai infrastructure": "ai-infrastructure",
  infrastructure: "ai-infrastructure",
  "ml infrastructure": "ai-infrastructure",
  "infrastructure monitoring": "ai-infrastructure",
  "ai infrastructure news": "ai-infrastructure",
  "llm infrastructure": "ai-infrastructure",
  "llm hosting": "ai-infrastructure",
  "llm deployment": "ai-infrastructure",
  "llm inference": "ai-infrastructure",
  "llm hardware": "ai-infrastructure",

  // AI Tools
  "ai tools": "ai-tools",
  tools: "ai-tools",
  "developer tools": "ai-tools",
  mlops: "ai-tools",
  directory: "ai-tools",
  "tools ranking": "ai-tools",
  "tool rankings": "ai-tools",
  "model tools": "ai-tools",
  "model rankings": "ai-tools",
  "model ranking": "ai-tools",
  "data tools": "ai-tools",
  "llm tools": "ai-tools",
  "local llm tools": "ai-tools",
  "ai development tools": "ai-tools",
  "llm performance": "ai-tools",
  development: "ai-tools",

  // LLM Guides
  "llm guides": "llm-guides",
  llms: "llm-guides",
  llm: "llm-guides",
  "llm apis": "llm-guides",
  "ai models": "llm-guides",
  "llm fundamentals": "llm-guides",
  "open source llms": "llm-guides",
  "open source ai": "llm-guides",
  "llm training": "llm-guides",
  "ai frameworks": "llm-guides",
  "ai apis": "llm-guides",
  "ai concepts": "llm-guides",
  "audio ai": "llm-guides",
  "document processing": "llm-guides",
  "hardware selection": "llm-guides",

  // Tutorials
  tutorials: "tutorials",
  tutorial: "tutorials",
  educational: "tutorials",
  "getting started": "tutorials",
  guide: "tutorials",
  guides: "tutorials",
  "deployment guides": "tutorials",
  "ai for writing": "tutorials",

  // Market Analysis
  "market analysis": "market-analysis",
  "news & analysis": "market-analysis",
  "industry analysis": "market-analysis",
  "market forecast": "market-analysis",
  "market intelligence": "market-analysis",
  "ai market analysis": "market-analysis",
  ranking: "market-analysis",
  listicle: "market-analysis",
};

export function getCategoryBySlug(slug: string): ArticleCategory | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function categoryToSlug(category: string): string | null {
  // Check if it's already a canonical name
  const direct = CATEGORIES.find((c) => c.name === category);
  if (direct) return direct.slug;

  // Look up in the map (case-insensitive)
  const mapped = CATEGORY_MAP[category.toLowerCase().trim()];
  if (mapped) return mapped;

  return null;
}
