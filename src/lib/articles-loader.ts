import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { logger } from "@/lib/logger";
import { categoryToSlug, getCategoryBySlug } from "@/lib/article-categories";

const ARTICLES_DIR = path.join(process.cwd(), "content/articles");

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  dateModified?: string;
  category?: string;
  keywords?: string[];
}

export function getAllArticleSlugs(): string[] {
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getArticleBySlug(slug: string): {
  frontmatter: ArticleFrontmatter;
  content: string;
} | null {
  const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return { frontmatter: data as ArticleFrontmatter, content };
  } catch (error) {
    logger.error(`[articles] Failed to parse ${slug}.mdx`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function getAllCategories(): {
  slug: string;
  name: string;
  count: number;
}[] {
  const slugs = getAllArticleSlugs();
  const counts = new Map<string, number>();

  for (const slug of slugs) {
    const article = getArticleBySlug(slug);
    if (!article?.frontmatter.category) continue;
    const catSlug = categoryToSlug(article.frontmatter.category);
    if (catSlug) {
      counts.set(catSlug, (counts.get(catSlug) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([slug, count]) => {
      const cat = getCategoryBySlug(slug);
      return cat ? { slug, name: cat.name, count } : null;
    })
    .filter(Boolean) as { slug: string; name: string; count: number }[];
}

export function getArticlesByCategory(
  catSlug: string,
): ArticleFrontmatter[] {
  const slugs = getAllArticleSlugs();
  const articles: ArticleFrontmatter[] = [];

  for (const slug of slugs) {
    const article = getArticleBySlug(slug);
    if (!article?.frontmatter.category) continue;
    const articleCatSlug = categoryToSlug(article.frontmatter.category);
    if (articleCatSlug === catSlug) {
      articles.push({ ...article.frontmatter, slug });
    }
  }

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
