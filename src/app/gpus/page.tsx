import type { Metadata } from "next";
import * as React from "react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { Client } from "@/features/data-explorer/table/client";
import { dataOptions } from "@/features/data-explorer/table/query-options";
import { searchParamsCache } from "@/features/data-explorer/table/search-params";
import { getGpuPricingPage } from "@/lib/gpu-pricing-loader";
import { buildGpuSchema } from "@/features/data-explorer/table/gpu-schema";
import { InternalLinkSection } from "@/components/seo/internal-links";
import { gpuPricingCache } from "@/lib/gpu-pricing-cache";
import { toGpuModelSlug } from "@/lib/gpu-model-slug";
import { getProviderDisplayName } from "@/features/data-explorer/table/provider-logos";
import { logger } from "@/lib/logger";
import { getResearchFreshness } from "@/lib/research/loader";
import {
  buildGpuDatasetStructuredData,
  combineStructuredData,
} from "@/lib/research/structured-data";

export const revalidate = 43200;

const GPU_META_TITLE = "GPU Cloud Pricing Comparison | Deploybase";
const GPU_META_DESCRIPTION =
  "GPU cloud pricing across all providers. Compare hourly rates, VRAM, specs, and availability.";
const SHARED_OG_IMAGE = "/assets/og-image.png";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: GPU_META_TITLE,
    description: GPU_META_DESCRIPTION,
    alternates: { canonical: "/gpus" },
    openGraph: {
      title: GPU_META_TITLE,
      description: GPU_META_DESCRIPTION,
      images: [SHARED_OG_IMAGE],
      url: "/gpus",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: GPU_META_TITLE,
      description: GPU_META_DESCRIPTION,
      images: [SHARED_OG_IMAGE],
    },
  };
}

// ISR-friendly route: we seed React Query with the default (unfiltered) data.
// Client-side nuqs manages URL-bound filters after hydration to keep SSR static.
export default async function GpusPage() {
  const parsedSearch = searchParamsCache.parse({});
  // Use new QueryClient for ISR - each page render gets fresh client
  // This is correct for server-side prefetching per TanStack Query docs
  const queryClient = new QueryClient();
  const captured: { firstPage: Awaited<ReturnType<typeof getGpuPricingPage>> | null } = { firstPage: null };

  if (parsedSearch.bookmarks !== "true") {
    try {
      const infiniteOptions = dataOptions(parsedSearch);
      // Prefetch using loader directly (more performant for ISR - no HTTP overhead)
      // Client will use API routes for subsequent pagination
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
      logger.error("[GpusPage] Failed to prefetch GPU data", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const dehydratedState = dehydrate(queryClient);
  const schemaMarkup = buildGpuSchema(captured.firstPage);
  const freshness = await getResearchFreshness();
  const structuredData = combineStructuredData(
    schemaMarkup,
    buildGpuDatasetStructuredData(freshness.gpuUpdatedAt),
  );

  // Fetch facets for sr-only internal links (uses cached singleton, same data as sitemap)
  let providerLinks: { href: string; label: string }[] = [];
  let modelLinks: { href: string; label: string }[] = [];
  try {
    const facets = await gpuPricingCache.getGpusFacets();
    providerLinks = facets.provider.rows.map((row) => ({
      href: `/gpus/${row.value.toLowerCase().trim()}`,
      label: getProviderDisplayName(row.value),
    }));
    modelLinks = facets.gpu_model.rows.map((row) => ({
      href: `/gpus/models/${toGpuModelSlug(row.value)}`,
      label: row.value,
    }));
  } catch (error) {
    logger.error("[GpusPage] Failed to fetch facets for internal links", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HydrationBoundary state={dehydratedState}>
        <div
          className="w-full"
          style={{
            "--total-padding-mobile": "0.5rem",
            "--total-padding-desktop": "3rem",
          } as React.CSSProperties}
        >
          <React.Suspense fallback={null}>
            <Client />
          </React.Suspense>
        </div>
      </HydrationBoundary>
      <InternalLinkSection heading="GPU Pricing by Provider" links={providerLinks} />
      <InternalLinkSection heading="GPU Pricing by Model" links={modelLinks} />
    </>
  );
}
