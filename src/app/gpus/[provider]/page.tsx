import { buildGpuSchema } from "@/features/data-explorer/table/gpu-schema";
import { dataOptions } from "@/features/data-explorer/table/query-options";
import { searchParamsCache } from "@/features/data-explorer/table/search-params";
import { getGpuPricingPage } from "@/lib/gpu-pricing-loader";
import { logger } from "@/lib/logger";
import { resolveGpuProviderRoute } from "@/lib/provider-route-resolver";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import * as React from "react";
import { ProviderGpuClient } from "./provider-gpu-client";

export const revalidate = 43200;

const KNOWN_NAMES: Record<string, string> = {
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
  fluidstack: "FluidStack",
  tensordock: "TensorDock",
  datacrunch: "DataCrunch",
  vultr: "Vultr",
  ovhcloud: "OVHcloud",
  scaleway: "Scaleway",
  massedcompute: "Massed Compute",
  jarvis: "Jarvis Labs",
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

function formatProvider(slug: string): string {
  return KNOWN_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

const SHARED_OG_IMAGE = "/assets/og-image.png";

type Props = { params: Promise<{ provider: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provider } = await params;
  const resolved = await resolveGpuProviderRoute(provider);
  if (!resolved) notFound();
  if (!resolved.isCanonical) permanentRedirect(`/gpus/${resolved.segment}`);
  const name = formatProvider(resolved.value);
  const title = `${name} GPU Pricing & Availability | Deploybase`;
  const description = `${name} GPU pricing with hourly rates, specs, and availability across all models.`;

  return {
    title,
    description,
    alternates: { canonical: `/gpus/${resolved.segment}` },
    openGraph: {
      title,
      description,
      images: [SHARED_OG_IMAGE],
      url: `/gpus/${resolved.segment}`,
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
 * SEO landing page for a specific GPU provider.
 *
 * We intentionally do NOT accept the `searchParams` page prop here because
 * doing so would opt this route into fully dynamic rendering (per Next.js docs)
 * and break our ISR strategy (revalidate = 43200s / 12hrs).
 *
 * Instead we seed the nuqs searchParamsCache directly with the route-segment
 * provider. This gives us:
 *   - Server: filtered HTML + JSON-LD for crawlers (ISR-cached)
 *   - Client: ProviderGpuClient wrapper pushes ?provider=X into the URL via
 *     useLayoutEffect so nuqs and React Query pick up the filter after hydration
 *
 * This matches the same pattern used by the main /gpus page which also calls
 * searchParamsCache.parse({}) without accepting searchParams.
 */
export default async function GpuProviderPage({ params }: Props) {
  const { provider } = await params;
  const resolved = await resolveGpuProviderRoute(provider);
  if (!resolved) notFound();
  if (!resolved.isCanonical) permanentRedirect(`/gpus/${resolved.segment}`);
  const parsedSearch = searchParamsCache.parse({ provider: [resolved.value] });
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
    logger.error("[GpuProviderPage] Failed to prefetch GPU data", {
      provider: resolved.value,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const dehydratedState = dehydrate(queryClient);
  const name = formatProvider(resolved.value);
  const schemaMarkup = buildGpuSchema(
    captured.firstPage,
    `${name} GPU Pricing Feed`,
    `${name} GPU pricing with hourly rates, specs, and availability across all models.`,
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
            <ProviderGpuClient provider={resolved.value} />
          </React.Suspense>
        </div>
      </HydrationBoundary>
    </>
  );
}
