import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/articles-loader";
import { categoryToSlug, getCategoryBySlug } from "@/lib/article-categories";
import { mdxComponents } from "../_components/mdx-components";

export const revalidate = 43200;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const { frontmatter } = article;
  const url = `/articles/${slug}`;
  const dateModified = frontmatter.dateModified || frontmatter.date;

  return {
    title: `${frontmatter.title} | DeployBase`,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url,
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

  const breadcrumbItems = [
    {
      "@type": "ListItem" as const,
      position: 1,
      name: "Articles",
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
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-4 text-sm text-foreground/50">
          <Link
            href="/articles"
            prefetch={false}
            className="hover:text-foreground"
          >
            Articles
          </Link>
          {catObj && catSlug && (
            <>
              <span className="mx-1.5">/</span>
              <Link
                href={`/articles/category/${catSlug}`}
                prefetch={false}
                className="hover:text-foreground"
              >
                {catObj.name}
              </Link>
            </>
          )}
          <span className="mx-1.5">/</span>
          <span className="text-foreground/70">{frontmatter.title}</span>
        </nav>
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {frontmatter.title}
          </h1>
          <p className="mt-2 text-sm text-foreground/50">
            {frontmatter.author} &middot;{" "}
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {frontmatter.category && catSlug && (
              <>
                {" "}
                &middot;{" "}
                <Link
                  href={`/articles/category/${catSlug}`}
                  prefetch={false}
                  className="hover:text-foreground"
                >
                  {frontmatter.category}
                </Link>
              </>
            )}
          </p>
        </header>
        <article className="prose dark:prose-invert max-w-none">
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
      </div>
    </>
  );
}
