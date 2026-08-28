import type { Metadata } from "next";
import * as React from "react";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { ToolsClient } from "@/features/data-explorer/tools/tools-client";
import { toolsDataOptions } from "@/features/data-explorer/tools/tools-query-options";
import { toolsSearchParamsCache } from "@/features/data-explorer/tools/tools-search-params";
import { getToolsPage } from "@/lib/tools-loader";
import { buildToolsSchema } from "@/features/data-explorer/tools/build-tools-schema";
import { logger } from "@/lib/logger";

export const revalidate = 43200;

const TOOLS_META_TITLE = "MLOps Tools Directory | Deploybase";
const TOOLS_META_DESCRIPTION =
  "Directory of MLOps tools for training, inference, and deployment. Browse by category and provider.";
const SHARED_OG_IMAGE = "/assets/og-image.png";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TOOLS_META_TITLE,
    description: TOOLS_META_DESCRIPTION,
    alternates: { canonical: "/tools" },
    openGraph: {
      title: TOOLS_META_TITLE,
      description: TOOLS_META_DESCRIPTION,
      images: [SHARED_OG_IMAGE],
      url: "/tools",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: TOOLS_META_TITLE,
      description: TOOLS_META_DESCRIPTION,
      images: [SHARED_OG_IMAGE],
    },
  };
}

export default async function ToolsPage() {
  const parsedSearch = toolsSearchParamsCache.parse({});
  const queryClient = new QueryClient();
  const captured: { firstPage: Awaited<ReturnType<typeof getToolsPage>> | null } = { firstPage: null };

  if (parsedSearch.bookmarks !== "true") {
    try {
      const infiniteOptions = toolsDataOptions(parsedSearch);
      await queryClient.prefetchInfiniteQuery({
        ...infiniteOptions,
        queryFn: async ({ pageParam }) => {
          const cursor =
            typeof pageParam?.cursor === "number" ? pageParam.cursor : null;
          const size =
            (pageParam as { size?: number } | undefined)?.size ??
            parsedSearch.size ??
            50;
          const result = await getToolsPage({
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
      logger.error("[ToolsPage] Failed to prefetch tools data", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const dehydratedState = dehydrate(queryClient);
  const schemaMarkup = buildToolsSchema(captured.firstPage);

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
          style={{
            "--total-padding-mobile": "0.5rem",
            "--total-padding-desktop": "3rem",
          } as React.CSSProperties}
        >
          <React.Suspense fallback={null}>
            <ToolsClient />
          </React.Suspense>
        </div>
      </HydrationBoundary>
    </>
  );
}
