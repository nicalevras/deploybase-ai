import { categoryToSlug } from "../article-categories.ts";

export interface SitemapArticleDateSource {
  category?: string;
  date: string;
  dateModified?: string;
}

export function toSitemapDate(
  value: Date | string | null | undefined,
): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function resolveArticleModifiedDate(
  article: SitemapArticleDateSource,
): Date | undefined {
  return toSitemapDate(article.dateModified ?? article.date);
}

export function newestSitemapDate(
  values: Array<Date | string | null | undefined>,
): Date | undefined {
  let newest: Date | undefined;

  for (const value of values) {
    const date = toSitemapDate(value);
    if (date && (!newest || date > newest)) newest = date;
  }

  return newest;
}

export function newestArticleDate(
  articles: SitemapArticleDateSource[],
  categorySlug?: string,
): Date | undefined {
  return newestSitemapDate(
    articles
      .filter(
        (article) =>
          !categorySlug ||
          (article.category && categoryToSlug(article.category) === categorySlug),
      )
      .map((article) => resolveArticleModifiedDate(article)),
  );
}
