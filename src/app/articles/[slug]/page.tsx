import { SiteFooter } from "@/components/site/site-footer";
import { categoryToSlug, getCategoryBySlug } from "@/lib/article-categories";
import {
  getAllArticleSlugs,
  getArticleBySlug,
  getArticleMetadataBySlug,
  getArticlesByCategory,
} from "@/lib/articles-loader";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "../_components/mdx-components";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";

export const revalidate = 43200;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const frontmatter = getArticleMetadataBySlug(slug);
  if (!frontmatter) return {};
  const url = `/articles/${slug}`;
  const dateModified = frontmatter.dateModified || frontmatter.date;

  return {
    title: `${frontmatter.title} | Deploybase`,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url,
      siteName: OG_SITE_NAME,
      images: [OG_IMAGE],
      type: "article",
      publishedTime: frontmatter.date,
      modifiedTime: dateModified,
      section: frontmatter.category,
      authors: [frontmatter.author],
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const { frontmatter, content } = article;
  const dateModified = frontmatter.dateModified || frontmatter.date;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.date,
    dateModified,
    ...(frontmatter.category && { articleSection: frontmatter.category }),
    ...(frontmatter.keywords && {
      keywords: frontmatter.keywords.join(", "),
    }),
    author: {
      "@type": "Organization",
      name: frontmatter.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Deploybase",
      url: "https://deploybase.ai",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://deploybase.ai/articles/${slug}`,
    },
  };

  const catSlug = frontmatter.category
    ? categoryToSlug(frontmatter.category)
    : null;
  const catObj = catSlug ? getCategoryBySlug(catSlug) : null;
  const relatedArticles = catSlug
    ? getArticlesByCategory(catSlug)
        .filter((item) => item.slug !== slug)
        .slice(0, 5)
    : [];

  const breadcrumbItems = [
    {
      "@type": "ListItem" as const,
      position: 1,
      name: "Research",
      item: "https://deploybase.ai/articles",
    },
  ];
  if (catObj && catSlug) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: catObj.name,
      item: `https://deploybase.ai/articles/category/${catSlug}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: frontmatter.title,
      item: `https://deploybase.ai/articles/${slug}`,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: frontmatter.title,
      item: `https://deploybase.ai/articles/${slug}`,
    });
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <nav
          className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href="/articles"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Research
          </Link>
          {catObj && catSlug && (
            <>
              <span>/</span>
              <Link
                href={`/articles/category/${catSlug}`}
                prefetch={false}
                className="truncate hover:text-foreground"
              >
                {catObj.name}
              </Link>
            </>
          )}
        </nav>
        <header className="mt-8 border-b border-border pb-10">
          {frontmatter.category ? (
            <p className="text-xs font-semibold text-signal">
              {frontmatter.category.toUpperCase()}
            </p>
          ) : null}
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-[1.1] sm:text-5xl">
            {frontmatter.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {frontmatter.description}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            By{" "}
            <span className="font-medium text-foreground">
              {frontmatter.author}
            </span>{" "}
            ·{" "}
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>
        <article className="prose prose-neutral mx-auto max-w-3xl py-10 prose-headings:font-semibold prose-a:text-signal prose-a:no-underline hover:prose-a:underline prose-code:font-mono prose-table:text-sm sm:py-14">
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                format: "md",
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug],
              },
            }}
          />
        </article>
        {relatedArticles.length ? (
          <aside
            className="border-t border-border pt-8"
            aria-labelledby="related-title"
          >
            <div className="flex items-end justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold text-signal">
                  CONTINUE READING
                </p>
                <h2 id="related-title" className="mt-2 text-2xl font-semibold">
                  Related research
                </h2>
              </div>
              {catObj && catSlug ? (
                <Link
                  href={`/articles/category/${catSlug}`}
                  prefetch={false}
                  className="text-sm font-medium text-foreground hover:text-signal"
                >
                  View topic
                </Link>
              ) : null}
            </div>
            <div className="divide-y divide-border">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/articles/${related.slug}`}
                  prefetch={false}
                  className="grid gap-2 py-4 hover:text-signal sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
                >
                  <time className="numeric text-xs text-muted-foreground">
                    {new Date(related.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                  <span className="font-medium">{related.title}</span>
                  <ArrowRight className="hidden h-4 w-4 sm:block" />
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
      <SiteFooter />
    </>
  );
}
