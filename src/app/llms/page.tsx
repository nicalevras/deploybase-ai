import type { Metadata } from "next";
import * as React from "react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { ModelsClient } from "@/features/data-explorer/models/models-client";
import { modelsDataOptions } from "@/features/data-explorer/models/models-query-options";
import { modelsSearchParamsCache } from "@/features/data-explorer/models/models-search-params";
import { getModelsPage } from "@/lib/models-loader";
import { buildModelsSchema } from "@/features/data-explorer/models/build-models-schema";
import { InternalLinkSection } from "@/components/seo/internal-links";
import { modelsCache } from "@/lib/models-cache";
import { logger } from "@/lib/logger";
import { getResearchFreshness } from "@/lib/research/loader";
import {
  buildLlmDatasetStructuredData,
  combineStructuredData,
} from "@/lib/research/structured-data";

export const revalidate = 43200;

const LLMS_META_TITLE = "LLM API Pricing Comparison | Deploybase";
const LLMS_META_DESCRIPTION =
  "LLM API pricing across all providers. Compare cost per token, context windows, and models.";
const SHARED_OG_IMAGE = "/assets/og-image.png";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: LLMS_META_TITLE,
    description: LLMS_META_DESCRIPTION,
    alternates: { canonical: "/llms" },
    openGraph: {
      title: LLMS_META_TITLE,
      description: LLMS_META_DESCRIPTION,
      url: "/llms",
      images: [SHARED_OG_IMAGE],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: LLMS_META_TITLE,
      description: LLMS_META_DESCRIPTION,
      images: [SHARED_OG_IMAGE],
    },
  };
}

// ISR-friendly route: we seed React Query with the default (unfiltered) data.
// Client-side nuqs manages URL-bound filters after hydration to keep SSR static.
export default async function ModelsPage() {
  const parsedSearch = modelsSearchParamsCache.parse({});
  // Use new QueryClient for ISR - each page render gets fresh client
  // This is correct for server-side prefetching per TanStack Query docs
  const queryClient = new QueryClient();
  const captured: { firstPage: Awaited<ReturnType<typeof getModelsPage>> | null } = { firstPage: null };

  if (parsedSearch.bookmarks !== "true") {
    try {
      const infiniteOptions = modelsDataOptions(parsedSearch);
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
          const result = await getModelsPage({
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
      logger.error("[ModelsPage] Failed to prefetch models data", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const dehydratedState = dehydrate(queryClient);
  const schemaMarkup = buildModelsSchema(captured.firstPage);
  const freshness = await getResearchFreshness();
  const structuredData = combineStructuredData(
    schemaMarkup,
    buildLlmDatasetStructuredData(freshness.llmUpdatedAt),
  );

  // Fetch providers for sr-only internal links (uses cached singleton, same data as sitemap)
  let providerLinks: { href: string; label: string }[] = [];
  try {
    const providers = await modelsCache.getAvailableProviders();
    providerLinks = providers.map((name) => ({
      href: `/llms/${encodeURIComponent(name)}`,
      label: name,
    }));
  } catch (error) {
    logger.error("[ModelsPage] Failed to fetch providers for internal links", {
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
            <ModelsClient />
          </React.Suspense>
        </div>
      </HydrationBoundary>
      <InternalLinkSection heading="LLM Pricing by Provider" links={providerLinks} />
    </>
  );
}
