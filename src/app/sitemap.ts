import type { MetadataRoute } from "next";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { modelsCache } from "@/lib/models-cache";
import { toGpuModelSlug } from "@/lib/gpu-model-slug";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/articles-loader";
import { CATEGORIES } from "@/lib/article-categories";
import { logger } from "@/lib/logger";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deploybase.ai";

export const revalidate = 43200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/gpus`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/llms`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tools`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Dynamically add provider and model pages from the database
  let gpuProviderPages: MetadataRoute.Sitemap = [];
  let gpuModelPages: MetadataRoute.Sitemap = [];
  let llmProviderPages: MetadataRoute.Sitemap = [];

  try {
    const gpuFacets = await gpuPricingCache.getGpusFacets();
    gpuProviderPages = gpuFacets.provider.rows.map((row) => ({
      url: `${SITE_URL}/gpus/${encodeURIComponent(row.value)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
    gpuModelPages = gpuFacets.gpu_model.rows.map((row) => ({
      url: `${SITE_URL}/gpus/models/${toGpuModelSlug(row.value)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch (error) {
    logger.error("[sitemap] Failed to fetch GPU providers/models", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const llmProviders = await modelsCache.getAvailableProviders();
    llmProviderPages = llmProviders.map((provider) => ({
      url: `${SITE_URL}/llms/${encodeURIComponent(provider)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch (error) {
    logger.error("[sitemap] Failed to fetch LLM providers", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/articles/category/${cat.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const slugs = getAllArticleSlugs();
    articlePages = slugs
      .map((slug) => {
        const article = getArticleBySlug(slug);
        if (!article) return null;
        const articleDate = article.frontmatter.date
          ? new Date(article.frontmatter.date)
          : lastModified;
        return {
          url: `${SITE_URL}/articles/${slug}`,
          lastModified: articleDate,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch (error) {
    logger.error("[sitemap] Failed to read article slugs", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return [...staticPages, ...gpuProviderPages, ...gpuModelPages, ...llmProviderPages, ...categoryPages, ...articlePages];
}
