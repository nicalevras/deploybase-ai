import type { MetadataRoute } from "next";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { modelsCache } from "@/lib/models-cache";
import { toGpuModelSlug } from "@/lib/gpu-model-slug";
import { getAllArticleMetadata } from "@/lib/articles-loader";
import { CATEGORIES } from "@/lib/article-categories";
import { logger } from "@/lib/logger";
import { getResearchFreshness } from "@/lib/research/loader";
import {
  newestArticleDate,
  newestSitemapDate,
  resolveArticleModifiedDate,
} from "@/lib/research/sitemap-dates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://deploybase.ai";

export const revalidate = 43200;

function sitemapEntry(
  url: string,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return lastModified ? { url, lastModified } : { url };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const freshness = await getResearchFreshness();
  let articles: ReturnType<typeof getAllArticleMetadata> = [];
  try {
    articles = getAllArticleMetadata();
  } catch (error) {
    logger.error("[sitemap] Failed to read article metadata", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const gpuModified = newestSitemapDate([freshness.gpuUpdatedAt]);
  const llmModified = newestSitemapDate([freshness.llmUpdatedAt]);
  const researchModified = newestArticleDate(articles);
  const homepageModified = newestSitemapDate([
    gpuModified,
    llmModified,
    researchModified,
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    sitemapEntry(`${SITE_URL}/`, homepageModified),
    sitemapEntry(`${SITE_URL}/gpus`, gpuModified),
    sitemapEntry(`${SITE_URL}/llms`, llmModified),
    sitemapEntry(`${SITE_URL}/tools`),
    sitemapEntry(`${SITE_URL}/articles`, researchModified),
  ];

  // Dynamically add provider and model pages from the database
  let gpuProviderPages: MetadataRoute.Sitemap = [];
  let gpuModelPages: MetadataRoute.Sitemap = [];
  let llmProviderPages: MetadataRoute.Sitemap = [];

  try {
    const gpuFacets = await gpuPricingCache.getGpusFacets();
    gpuProviderPages = gpuFacets.provider.rows.map((row) =>
      sitemapEntry(
        `${SITE_URL}/gpus/${encodeURIComponent(row.value)}`,
        gpuModified,
      ),
    );
    gpuModelPages = gpuFacets.gpu_model.rows.map((row) =>
      sitemapEntry(
        `${SITE_URL}/gpus/models/${toGpuModelSlug(row.value)}`,
        gpuModified,
      ),
    );
  } catch (error) {
    logger.error("[sitemap] Failed to fetch GPU providers/models", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const llmProviders = await modelsCache.getAvailableProviders();
    llmProviderPages = llmProviders.map((provider) =>
      sitemapEntry(
        `${SITE_URL}/llms/${encodeURIComponent(provider)}`,
        llmModified,
      ),
    );
  } catch (error) {
    logger.error("[sitemap] Failed to fetch LLM providers", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((category) =>
    sitemapEntry(
      `${SITE_URL}/articles/category/${category.slug}`,
      newestArticleDate(articles, category.slug),
    ),
  );

  const articlePages: MetadataRoute.Sitemap = articles.map((article) =>
    sitemapEntry(
      `${SITE_URL}/articles/${article.slug}`,
      resolveArticleModifiedDate(article),
    ),
  );

  return [...staticPages, ...gpuProviderPages, ...gpuModelPages, ...llmProviderPages, ...categoryPages, ...articlePages];
}
