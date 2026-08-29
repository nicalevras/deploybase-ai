import { NewsletterSignup } from "@/components/site/newsletter-signup";
import { SiteFooter } from "@/components/site/site-footer";
import {
  getHomepageResearchManifest,
  getResearchTotals,
} from "@/lib/research/loader";
import { buildHomepageStructuredData } from "@/lib/research/structured-data";
import { formatResearchTotal } from "@/lib/research/manifest";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  GpuMarketController,
  LlmMarketController,
} from "./research-client";
import { LatestResearch } from "./latest-research";
import { ResearchSurfaceSkeleton } from "./research-surface-skeleton";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";

export const revalidate = 43200;

const HOME_META_TITLE =
  "AI Compute Pricing and Performance Benchmarks | Deploybase";
const HOME_META_DESCRIPTION =
  "Live GPU cloud and LLM API pricing, performance benchmarks, and market data across leading AI infrastructure providers. Analyze the AI compute market.";
const HOME_URL = "https://deploybase.ai";

const homepageJsonLd = buildHomepageStructuredData({
  title: HOME_META_TITLE,
  description: HOME_META_DESCRIPTION,
  siteUrl: HOME_URL,
});

export const metadata: Metadata = {
  title: HOME_META_TITLE,
  description: HOME_META_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_META_TITLE,
    description: HOME_META_DESCRIPTION,
    url: "/",
    siteName: OG_SITE_NAME,
    images: [OG_IMAGE],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_META_TITLE,
    description: HOME_META_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

function getCurrentDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

function MarketStatsList({
  providers,
  gpuRows,
  llmRows,
  pending = false,
}: {
  providers: string;
  gpuRows: string;
  llmRows: string;
  pending?: boolean;
}) {
  const marketStats = [
    { label: "Updated", value: getCurrentDate(), static: true },
    { label: "Providers", value: providers, static: false },
    { label: "GPU listings", value: gpuRows, static: false },
    { label: "LLM endpoints", value: llmRows, static: false },
  ];

  return (
    <dl className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
      {marketStats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "relative bg-background px-4 py-8 sm:px-5 lg:px-6",
            index >= 2 && "border-t border-border lg:border-t-0",
            index > 0 &&
              "before:absolute before:inset-y-8 before:left-0 before:w-px before:bg-border before:content-['']",
            index === 2 && "before:hidden lg:before:block",
          )}
        >
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">
            {pending && !stat.static ? (
              <span className="block h-4 w-14 animate-pulse rounded-sm bg-muted" />
            ) : (
              stat.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function MarketStats() {
  const totals = await getResearchTotals();
  return (
    <MarketStatsList
      providers={formatResearchTotal(totals?.providers)}
      gpuRows={formatResearchTotal(totals?.gpuRows)}
      llmRows={formatResearchTotal(totals?.llmRows)}
    />
  );
}

async function GpuResearchController({
  manifestPromise,
}: {
  manifestPromise: ReturnType<typeof getHomepageResearchManifest>;
}) {
  const manifest = await manifestPromise;
  return <GpuMarketController {...manifest.gpu} />;
}

async function LlmResearchController({
  manifestPromise,
}: {
  manifestPromise: ReturnType<typeof getHomepageResearchManifest>;
}) {
  const manifest = await manifestPromise;
  return <LlmMarketController {...manifest.llm} />;
}

function ResearchControllerFallback({ kind }: { kind: "gpu" | "llm" }) {
  return (
    <div className="contents" aria-hidden="true">
      <div className="z-10 col-start-1 row-start-2 mt-[42px] h-10 w-full min-w-0 animate-pulse justify-self-start rounded-sm border border-border bg-site-chrome sm:col-start-2 sm:row-start-1 sm:mt-[22px] sm:w-64 sm:justify-self-end sm:self-end" />
      <ResearchSurfaceSkeleton
        kind={kind}
        className="col-start-1 row-start-3 sm:col-span-2 sm:row-start-2"
      />
    </div>
  );
}

function ResearchControlLabel({ children }: { children: string }) {
  return (
    <div className="col-start-1 row-start-2 mt-5 h-[62px] w-full min-w-0 justify-self-start text-[11px] font-semibold uppercase text-muted-foreground sm:col-start-2 sm:row-start-1 sm:mt-0 sm:w-64 sm:justify-self-end sm:self-end">
      {children}
    </div>
  );
}

export default function HomePage() {
  const manifestPromise = getHomepageResearchManifest();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homepageJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section aria-labelledby="hero-title">
        <header className="mx-auto w-full max-w-[1400px] px-5 pt-8 sm:px-8 sm:pt-16">
          <div className="border-b border-border pt-0 sm:border-t sm:pt-8">
            <div className="grid gap-0 pb-0 min-[900px]:grid-cols-[minmax(0,1fr)_22rem] min-[900px]:items-center min-[900px]:gap-10 min-[900px]:pb-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
              <div>
                <h1
                  id="hero-title"
                  className="max-w-5xl text-[2.74rem] font-semibold leading-[1.02] tracking-tighter sm:text-[3.75rem] lg:text-[4.5rem]"
                >
                  Market intelligence for AI compute
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Live GPU cloud and LLM API pricing, performance benchmarks,
                  and market data across leading AI infrastructure providers.
                </p>
                <div className="max-w-2xl">
                  <NewsletterSignup />
                </div>
              </div>

              <aside className="relative mt-8 border-t border-border min-[900px]:mt-0 min-[900px]:self-stretch min-[900px]:border-t-0 min-[900px]:pt-2 min-[900px]:before:absolute min-[900px]:before:inset-y-0 min-[900px]:before:-left-5 min-[900px]:before:w-px min-[900px]:before:bg-border min-[900px]:before:content-[''] lg:before:-left-8">
                <nav aria-label="Research shortcuts">
                  <Link
                    href="/gpus"
                    prefetch={false}
                    className="group grid grid-cols-[minmax(0,1fr)_3rem] gap-5 py-6"
                  >
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold leading-tight transition-colors group-hover:text-signal">
                        GPUs
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        View GPU instance pricing by model, configuration, and
                        provider.
                      </span>
                    </span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-accent group-hover:text-signal">
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Link>
                  <Link
                    href="/llms"
                    prefetch={false}
                    className="group grid grid-cols-[minmax(0,1fr)_3rem] gap-5 border-t border-border py-6"
                  >
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold leading-tight transition-colors group-hover:text-signal">
                        LLMs
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        View LLM inference pricing and benchmarks by provider.
                      </span>
                    </span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-accent group-hover:text-signal">
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Link>
                  <Link
                    href="/tools"
                    prefetch={false}
                    className="group grid grid-cols-[minmax(0,1fr)_3rem] gap-5 border-t border-border py-6"
                  >
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold leading-tight transition-colors group-hover:text-signal">
                        MLOps
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        Discover tools for training, inference,
                        observability, and deployment.
                      </span>
                    </span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-accent group-hover:text-signal">
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Link>
                </nav>
              </aside>
            </div>
            <Suspense
              fallback={
                <MarketStatsList providers="" gpuRows="" llmRows="" pending />
              }
            >
              <MarketStats />
            </Suspense>
          </div>
        </header>
      </section>

      <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8 sm:py-16">
        <section
          aria-labelledby="gpu-market-title"
          className="grid min-w-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <p className="research-kicker">GPUs</p>
            <h2
              id="gpu-market-title"
              className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl"
            >
              GPU cloud prices by provider
            </h2>
          </div>
          <ResearchControlLabel>GPU model</ResearchControlLabel>
          <Suspense fallback={<ResearchControllerFallback kind="gpu" />}>
            <GpuResearchController manifestPromise={manifestPromise} />
          </Suspense>
        </section>

        <section
          aria-labelledby="llm-market-title"
          className="mt-8 grid min-w-0 border-t border-border pt-8 sm:mt-16 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        >
          <div>
            <p className="research-kicker">LLMs</p>
            <h2
              id="llm-market-title"
              className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl"
            >
              LLM performance vs cost
            </h2>
          </div>
          <ResearchControlLabel>LLM model</ResearchControlLabel>
          <Suspense fallback={<ResearchControllerFallback kind="llm" />}>
            <LlmResearchController manifestPromise={manifestPromise} />
          </Suspense>
        </section>
      </div>

      <LatestResearch />
      <SiteFooter />
    </>
  );
}
