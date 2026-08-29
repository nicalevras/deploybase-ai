import { SiteFooter } from "@/components/site/site-footer";
import { CATEGORIES, getCategoryBySlug } from "@/lib/article-categories";
import { buildCategoryCollectionJsonLd } from "@/lib/article-category-structured-data";
import { getArticlesByCategory } from "@/lib/articles-loader";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCollection } from "../../_components/article-collection";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";

export const revalidate = 43200;

interface Props {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  const url = `/articles/category/${slug}`;
  return {
    title: `${category.name} Articles | Deploybase`,
    description: category.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${category.name} Articles`,
      description: category.description,
      url,
      siteName: OG_SITE_NAME,
      images: [OG_IMAGE],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} Articles`,
      description: category.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const articles = getArticlesByCategory(slug);
  const categoryIndex = CATEGORIES.findIndex((item) => item.slug === slug);
  const nextCategory = CATEGORIES[(categoryIndex + 1) % CATEGORIES.length];

  const collectionJsonLd = buildCategoryCollectionJsonLd(
    category,
    slug,
    articles,
  );
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Research",
        item: "https://deploybase.ai/articles",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `https://deploybase.ai/articles/category/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ArticleCollection
        eyebrow="RESEARCH TOPIC"
        title={category.name}
        description={category.description}
        articles={articles}
        continuation={{
          label: nextCategory.name,
          href: `/articles/category/${nextCategory.slug}`,
        }}
      />
      <SiteFooter />
    </>
  );
}
