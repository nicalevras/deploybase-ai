import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/articles-loader";
import { CATEGORIES } from "@/lib/article-categories";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Articles | DeployBase",
  description:
    "GPU pricing guides, LLM comparisons, and AI infrastructure articles.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "Articles | DeployBase",
    description:
      "GPU pricing guides, LLM comparisons, and AI infrastructure articles.",
    url: "/articles",
    type: "website",
  },
};

export default function ArticlesPage() {
  const slugs = getAllArticleSlugs();
  const articles = slugs
    .map((slug) => {
      const article = getArticleBySlug(slug);
      if (!article) return null;
      return { ...article.frontmatter, slug };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.date).getTime() - new Date(a!.date).getTime(),
    ) as Array<{
    slug: string;
    title: string;
    description: string;
    date: string;
    category?: string;
  }>;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Articles",
    description:
      "GPU pricing guides, LLM comparisons, and AI infrastructure articles.",
    url: "https://deploybase.ai/articles",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement: CATEGORIES.map((cat, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://deploybase.ai/articles/category/${cat.slug}`,
        name: cat.name,
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
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-foreground">Articles</h1>
        <p className="mt-2 text-sm text-foreground/50">
          {articles.length} guides on GPU pricing, LLM comparisons, and AI
          infrastructure.
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
