import type { Metadata } from "next";
import * as React from "react";
import { notFound } from "next/navigation";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { dataOptions } from "@/features/data-explorer/table/query-options";
import { ModelGpuClient } from "./model-gpu-client";
import { searchParamsCache } from "@/features/data-explorer/table/search-params";
import { getGpuPricingPage } from "@/lib/gpu-pricing-loader";
import { buildGpuSchema } from "@/features/data-explorer/table/gpu-schema";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { toGpuModelSlug, resolveGpuModelFromSlug } from "@/lib/gpu-model-slug";
import { logger } from "@/lib/logger";

export const revalidate = 43200;

const SHARED_OG_IMAGE = "/assets/og-image.png";

type Props = { params: Promise<{ model: string }> };

/**
 * Resolve slug → display name via facets lookup.
 * Cached within the request because getGpusFacets uses unstable_cache internally.
 */
async function resolveModel(slug: string): Promise<string | null> {
  const facets = await gpuPricingCache.getGpusFacets();
  return resolveGpuModelFromSlug(slug, facets.gpu_model.rows);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model: slug } = await params;
  const modelName = await resolveModel(slug);

  if (!modelName) {
    return { title: "GPU Model Not Found | Deploybase" };
  }

  const title = `${modelName} Pricing Across Cloud Providers | Deploybase`;
  const description = `${modelName} pricing across all cloud providers. Compare hourly rates, availability, and specs.`;

  return {
    title,
    description,
    alternates: { canonical: `/gpus/models/${slug}` },
    openGraph: {
      title,
      description,
      images: [SHARED_OG_IMAGE],
      url: `/gpus/models/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARED_OG_IMAGE],
    },
  };
}

/**
 * SEO landing page for a specific GPU model.
 *
 * Mirrors the pattern used by /gpus/[provider]/page.tsx:
 *   - Resolves the slug to the real model name via DB facets
 *   - Seeds the searchParamsCache with gpu_model filter (NOT via searchParams prop, to preserve ISR)
 *   - Prefetches the first page of data for hydration
 *   - Renders H1 + JSON-LD for crawlers
 *   - Client wrapper pushes ?gpu_model=X into the URL after hydration
 */
export default async function GpuModelPage({ params }: Props) {
  const { model: slug } = await params;
  const modelName = await resolveModel(slug);

  if (!modelName) {
    notFound();
  }

  const parsedSearch = searchParamsCache.parse({ gpu_model: [modelName] });
  const queryClient = new QueryClient();
  const captured: {
    firstPage: Awaited<ReturnType<typeof getGpuPricingPage>> | null;
  } = { firstPage: null };

  try {
    const infiniteOptions = dataOptions(parsedSearch);
    await queryClient.prefetchInfiniteQuery({
      ...infiniteOptions,
      queryFn: async ({ pageParam }) => {
        const cursor =
          typeof pageParam?.cursor === "number" ? pageParam.cursor : null;
        const size =
          (pageParam as { size?: number } | undefined)?.size ??
          parsedSearch.size ??
          50;
        const result = await getGpuPricingPage({
          ...parsedSearch,
          cursor,
          size,
          uuid: null,
        });
        if (!captured.firstPage && (cursor === null || cursor === 0)) {
          captured.firstPage = result;
        }
        return result;
      },
    });
  } catch (error) {
    logger.error("[GpuModelPage] Failed to prefetch GPU data", {
      model: modelName,
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const dehydratedState = dehydrate(queryClient);
  const schemaMarkup = buildGpuSchema(
    captured.firstPage,
    `${modelName} GPU Pricing Feed`,
    `${modelName} pricing across all cloud providers. Compare hourly rates, availability, and specs.`,
  );

  return (
    <>
      {schemaMarkup ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaMarkup).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <HydrationBoundary state={dehydratedState}>
        <div
          className="w-full"
          style={
            {
              "--total-padding-mobile": "0.5rem",
              "--total-padding-desktop": "3rem",
            } as React.CSSProperties
          }
        >
          <React.Suspense fallback={null}>
            <ModelGpuClient gpuModel={modelName} />
          </React.Suspense>
        </div>
      </HydrationBoundary>
    </>
  );
}
