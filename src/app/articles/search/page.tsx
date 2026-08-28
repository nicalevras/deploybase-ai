import { SiteFooter } from "@/components/site/site-footer";
import { normalizeArticleSearchText } from "@/lib/article-search";
import {
  getAllArticleMetadata,
  type ArticleFrontmatter,
} from "@/lib/articles-loader";
import type { Metadata } from "next";
import { ArticleCollection } from "../_components/article-collection";

export const metadata: Metadata = {
  title: "Research Search | Deploybase",
  description: "Search Deploybase AI infrastructure research and analysis.",
  robots: { index: false, follow: true },
};

export default async function ArticleSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawSearch = resolvedSearchParams.search;
  const query = (Array.isArray(rawSearch) ? rawSearch[0] : rawSearch)
    ?.trim()
    .slice(0, 80);
  const normalizedQuery = normalizeArticleSearchText(query);
  const articles = normalizedQuery
    ? getAllArticleMetadata()
        .filter((article) => articleMatches(article, normalizedQuery))
        .sort(
          (left, right) =>
            articleRelevance(left, normalizedQuery) -
              articleRelevance(right, normalizedQuery) ||
            Date.parse(right.date) - Date.parse(left.date),
        )
    : [];

  return (
    <>
      <ArticleCollection
        eyebrow="RESEARCH SEARCH"
        title="Search results"
        description={
          query
            ? `${articles.length.toLocaleString()} ${articles.length === 1 ? "result" : "results"} for “${query}”.`
            : "Search Deploybase research from the navigation above."
        }
        articles={articles}
        continuation={{ label: "All research", href: "/articles" }}
        emptyMessage={
          query
            ? `No research matched “${query}”.`
            : "Enter a search to find research."
        }
      />
      <SiteFooter />
    </>
  );
}

function articleMatches(article: ArticleFrontmatter, query: string) {
  return normalizeArticleSearchText(
    [
      article.title,
      article.description,
      article.category,
      ...(article.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(query);
}

function articleRelevance(article: ArticleFrontmatter, query: string) {
  const values = [article.title, article.category, article.description];
  let score = 100;

  values.forEach((value, index) => {
    const normalizedValue = normalizeArticleSearchText(value);
    if (!normalizedValue) return;
    if (normalizedValue === query) score = Math.min(score, index);
    else if (normalizedValue.startsWith(query)) {
      score = Math.min(score, 10 + index);
    } else if (normalizedValue.includes(query)) {
      score = Math.min(score, 20 + index);
    }
  });

  return score;
}
