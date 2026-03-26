import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategoryBySlug } from "@/lib/article-categories";
import { getArticlesByCategory } from "@/lib/articles-loader";

export const revalidate = 43200;

interface Props {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};

  const url = `/articles/category/${slug}`;

  return {
    title: `${cat.name} Articles | DeployBase`,
    description: cat.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${cat.name} Articles`,
      description: cat.description,
      url,
      type: "website",
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const articles = getArticlesByCategory(slug);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${cat.name} Articles`,
    description: cat.description,
    url: `https://deploybase.ai/articles/category/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement: articles.slice(0, 50).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://deploybase.ai/articles/${a.slug}`,
        name: a.title,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Articles",
        item: "https://deploybase.ai/articles",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: cat.name,
        item: `https://deploybase.ai/articles/category/${slug}`,
      },
    ],
  };

  return (
    <>
      <h1 className="sr-only">{cat.name} Articles</h1>
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
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-4 text-sm text-foreground/50">
          <Link
            href="/articles"
            prefetch={false}
            className="hover:text-foreground"
          >
            Articles
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground/70">{cat.name}</span>
        </nav>
        <h2 className="text-2xl font-bold text-foreground">{cat.name}</h2>
        <p className="mt-2 text-sm text-foreground/50">
          {articles.length} articles &middot; {cat.description}
        </p>
        <ul className="mt-8 space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                prefetch={false}
                className="text-sm text-foreground/80 hover:text-foreground underline underline-offset-2"
              >
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
