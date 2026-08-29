import { SiteFooter } from "@/components/site/site-footer";
import { CATEGORIES, categoryToSlug } from "@/lib/article-categories";
import { getAllArticleMetadata } from "@/lib/articles-loader";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: "AI/ML Research and Analysis | Deploybase",
  description:
    "Data-driven research on GPU economics, LLM performance, model training, inference, MLOps, and emerging trends across AI and machine learning.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "AI/ML Research and Analysis | Deploybase",
    description:
      "Data-driven research on GPU economics, LLM performance, model training, inference, MLOps, and emerging trends across AI and machine learning.",
    url: "/articles",
    siteName: OG_SITE_NAME,
    images: [OG_IMAGE],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI/ML Research and Analysis | Deploybase",
    description:
      "Data-driven research on GPU economics, LLM performance, model training, inference, MLOps, and emerging trends across AI and machine learning.",
    images: [OG_IMAGE],
  },
};

export default async function ArticlesPage() {
  const allArticles = getAllArticleMetadata().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const articles = allArticles;
  const groups = CATEGORIES.map((category) => ({
    ...category,
    articles: articles.filter(
      (article) =>
        article.category && categoryToSlug(article.category) === category.slug,
    ),
  }));

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Research",
    description:
      "GPU pricing guides, LLM comparisons, and AI infrastructure articles.",
    url: "https://deploybase.ai/articles",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: CATEGORIES.length,
      itemListElement: CATEGORIES.map((category, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://deploybase.ai/articles/category/${category.slug}`,
        name: category.name,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-8 sm:px-8 sm:pb-16 sm:pt-16">
        <header className="pb-8 sm:pb-16">
          <div>
            <p className="text-xs font-semibold text-signal">
              DEPLOYBASE RESEARCH
            </p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              AI/ML Research and Analysis
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Data-driven research on GPU economics, LLM performance, model
              training, inference, MLOps, and emerging trends across AI and
              machine learning.
            </p>
          </div>
        </header>

        <section
          className="border-t border-border pt-8 sm:pt-16"
          aria-labelledby="topics-title"
        >
          <div className="flex items-end justify-between pb-0 sm:pb-5">
            <div>
              <p className="text-xs font-semibold text-signal">CATEGORIES</p>
              <h2 id="topics-title" className="mt-2 text-2xl font-semibold">
                Browse by topic
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5">
            {groups.map((group, index) => (
              <Link
                key={group.slug}
                href={`/articles/category/${group.slug}`}
                prefetch={false}
                className={cn(
                  "block h-full py-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  index < groups.length - 1 && "border-b border-border",
                  isInLastGridRow(index, groups.length, 2)
                    ? "sm:border-b-0"
                    : "sm:border-b",
                  index % 2 === 0
                    ? "sm:pl-0 sm:pr-6"
                    : "sm:pl-6 sm:pr-0",
                  index % 2 === 0 && index < groups.length - 1
                    ? "sm:border-r"
                    : "sm:border-r-0",
                  isInLastGridRow(index, groups.length, 5)
                    ? "lg:border-b-0"
                    : "lg:border-b",
                  index % 5 === 0
                    ? "lg:pl-0 lg:pr-6"
                    : index % 5 === 4 || index === groups.length - 1
                      ? "lg:pl-6 lg:pr-0"
                      : "lg:px-6",
                  index % 5 !== 4 && index < groups.length - 1
                    ? "lg:border-r"
                    : "lg:border-r-0",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{group.name}</h3>
                  <span className="numeric text-xs text-muted-foreground">
                    {group.articles.length}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">
                  {group.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="border-t border-border pt-8 sm:mt-16 sm:pt-16"
          aria-labelledby="latest-title"
        >
          <div className="flex items-end justify-between pb-0 sm:pb-5">
            <div>
              <p className="text-xs font-semibold text-signal">RECENT</p>
              <h2 id="latest-title" className="mt-2 text-2xl font-semibold">
                Latest research
              </h2>
            </div>
            <Link
              href="#archive-title"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-signal"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 6).map((article, index, latestArticles) => (
              <ArticlePreview
                key={article.slug}
                article={article}
                index={index}
                total={latestArticles.length}
              />
            ))}
          </div>
        </section>

        <section
          className="border-t border-border pt-8 sm:mt-16 sm:pt-16"
          aria-labelledby="archive-title"
        >
          <div className="pb-4">
            <p className="text-xs font-semibold text-signal">ARCHIVE</p>
            <h2 id="archive-title" className="mt-2 text-2xl font-semibold">
              Complete research archive
            </h2>
          </div>
          <div className="divide-y divide-border">
            {groups.map((group) => (
              <details key={group.slug} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-4 text-left">
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  <span className="font-semibold">{group.name}</span>
                  <span className="numeric ml-auto text-xs text-muted-foreground">
                    {group.articles.length} articles
                  </span>
                </summary>
                <div className="grid gap-x-8 border-t border-border py-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/articles/${article.slug}`}
                      prefetch={false}
                      className="border-b border-border/70 py-3 text-sm leading-5 text-foreground/80 hover:text-signal"
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function ArticlePreview({
  article,
  index,
  total,
}: {
  article: {
    slug: string;
    title: string;
    description: string;
    date: string;
    category?: string;
  };
  index: number;
  total: number;
}) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      prefetch={false}
      className={cn(
        "block h-full py-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        index < total - 1 && "border-b border-border",
        isInLastGridRow(index, total, 2) ? "sm:border-b-0" : "sm:border-b",
        index % 2 === 0
          ? "sm:pl-0 sm:pr-6"
          : "sm:pl-6 sm:pr-0",
        index % 2 === 0 && index < total - 1
          ? "sm:border-r"
          : "sm:border-r-0",
        isInLastGridRow(index, total, 3) ? "lg:border-b-0" : "lg:border-b",
        index % 3 === 0
          ? "lg:pl-0 lg:pr-8"
          : index % 3 === 2 || index === total - 1
            ? "lg:pl-8 lg:pr-0"
            : "lg:px-8",
        index % 3 !== 2 && index < total - 1
          ? "lg:border-r"
          : "lg:border-r-0",
      )}
    >
      <article className="flex h-full flex-col">
        <div className="text-[11px] font-semibold uppercase text-signal">
          {article.category}
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {article.description}
        </p>
        <time
          className="mt-auto block pt-4 text-xs text-muted-foreground"
          dateTime={article.date}
        >
          {new Date(article.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </article>
    </Link>
  );
}

function isInLastGridRow(index: number, total: number, columns: number) {
  const lastRowSize = total % columns || Math.min(total, columns);
  return index >= total - lastRowSize;
}
