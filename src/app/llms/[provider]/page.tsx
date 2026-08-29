import { buildModelsSchema } from "@/features/data-explorer/models/build-models-schema";
import { modelsDataOptions } from "@/features/data-explorer/models/models-query-options";
import { modelsSearchParamsCache } from "@/features/data-explorer/models/models-search-params";
import { logger } from "@/lib/logger";
import { getModelsPage } from "@/lib/models-loader";
import { resolveLlmProviderRoute } from "@/lib/provider-route-resolver";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import * as React from "react";
import { ProviderLlmClient } from "./provider-llm-client";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";

export const revalidate = 43200;

type Props = { params: Promise<{ provider: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provider } = await params;
  const resolved = await resolveLlmProviderRoute(provider);
  if (!resolved) notFound();
  if (!resolved.isCanonical) permanentRedirect(`/llms/${resolved.segment}`);
  const name = resolved.value;
  const title = `${name} API Pricing | Deploybase`;
  const description = `${name} API pricing with cost per token across all models. Compare context windows and availability.`;

  return {
    title,
    description,
    alternates: { canonical: `/llms/${resolved.segment}` },
    openGraph: {
      title,
      description,
      siteName: OG_SITE_NAME,
      images: [OG_IMAGE],
      url: `/llms/${resolved.segment}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

/**
 * SEO landing page for a specific LLM provider.
 *
 * We intentionally do NOT accept the `searchParams` page prop here because
 * doing so would opt this route into fully dynamic rendering (per Next.js docs)
 * and break our ISR strategy (revalidate = 43200s / 12hrs).
 *
 * Instead we seed the nuqs searchParamsCache directly with the route-segment
 * provider. This gives us:
 *   - Server: filtered HTML + JSON-LD for crawlers (ISR-cached)
 *   - Client: ProviderLlmClient wrapper pushes ?provider=X into the URL via
 *     useLayoutEffect so nuqs and React Query pick up the filter after hydration
 *
 * This matches the same pattern used by the main /llms page which also calls
 * modelsSearchParamsCache.parse({}) without accepting searchParams.
 */
export default async function LlmProviderPage({ params }: Props) {
  const { provider } = await params;
  const resolved = await resolveLlmProviderRoute(provider);
  if (!resolved) notFound();
  if (!resolved.isCanonical) permanentRedirect(`/llms/${resolved.segment}`);
  const decodedProvider = resolved.value;
  const parsedSearch = modelsSearchParamsCache.parse({
    provider: [decodedProvider],
  });
  const queryClient = new QueryClient();
  const captured: {
    firstPage: Awaited<ReturnType<typeof getModelsPage>> | null;
  } = { firstPage: null };

  try {
    const infiniteOptions = modelsDataOptions(parsedSearch);
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
    logger.error("[LlmProviderPage] Failed to prefetch models data", {
      provider: decodedProvider,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const dehydratedState = dehydrate(queryClient);
  const schemaMarkup = buildModelsSchema(
    captured.firstPage,
    `${decodedProvider} LLM Inference Pricing Feed`,
    `${decodedProvider} API pricing with cost per token across all models. Compare context windows and availability.`,
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
            <ProviderLlmClient provider={decodedProvider} />
          </React.Suspense>
        </div>
      </HydrationBoundary>
    </>
  );
}
