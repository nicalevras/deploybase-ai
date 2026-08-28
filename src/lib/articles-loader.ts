import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { categoryToSlug, getCategoryBySlug } from "@/lib/article-categories";
import { normalizeArticleAuthor } from "@/lib/article-brand";
import { logger } from "@/lib/logger";

const ARTICLES_DIR = path.join(process.cwd(), "content/articles");
const FRONTMATTER_CHUNK_SIZE = 8 * 1024;
const MAX_FRONTMATTER_SIZE = 256 * 1024;

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

let metadataIndex: readonly ArticleFrontmatter[] | null = null;
let metadataBySlug: ReadonlyMap<string, ArticleFrontmatter> | null = null;

function readFrontmatter(filePath: string, slug: string): ArticleFrontmatter {
  const file = fs.openSync(filePath, "r");
  const chunks: Buffer[] = [];
  let bytesReadTotal = 0;

  try {
    while (bytesReadTotal < MAX_FRONTMATTER_SIZE) {
      const buffer = Buffer.alloc(FRONTMATTER_CHUNK_SIZE);
      const bytesRead = fs.readSync(
        file,
        buffer,
        0,
        buffer.length,
        bytesReadTotal,
      );
      if (!bytesRead) break;
      chunks.push(buffer.subarray(0, bytesRead));
      bytesReadTotal += bytesRead;

      const source = Buffer.concat(chunks).toString("utf8");
      const closingMatch = /\r?\n---(?:\r?\n|$)/.exec(source.slice(3));
      if (!closingMatch) continue;
      const closingStart = 3 + closingMatch.index;
      const frontmatterSource = source.slice(
        0,
        closingStart + closingMatch[0].length,
      );
      const { data } = matter(frontmatterSource);
      const frontmatter = data as ArticleFrontmatter;
      return Object.freeze({
        ...frontmatter,
        author: normalizeArticleAuthor(frontmatter.author),
        slug,
      });
    }
  } finally {
    fs.closeSync(file);
  }

  throw new Error(`Frontmatter delimiter not found within ${MAX_FRONTMATTER_SIZE} bytes`);
}

function buildMetadataIndex(): readonly ArticleFrontmatter[] {
  const articles: ArticleFrontmatter[] = [];
  for (const filename of fs.readdirSync(ARTICLES_DIR)) {
    if (!filename.endsWith(".mdx")) continue;
    const slug = filename.replace(/\.mdx$/, "");
    try {
      articles.push(readFrontmatter(path.join(ARTICLES_DIR, filename), slug));
    } catch (error) {
      logger.error(`[articles] Failed to parse metadata for ${filename}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  metadataIndex = Object.freeze(articles);
  metadataBySlug = new Map(articles.map((article) => [article.slug, article]));
  return metadataIndex;
}

function getMetadataIndex(): readonly ArticleFrontmatter[] {
  if (process.env.NODE_ENV === "development") {
    return buildMetadataIndex();
  }
  return metadataIndex ?? buildMetadataIndex();
}

export function getAllArticleMetadata(): ArticleFrontmatter[] {
  return [...getMetadataIndex()];
}

export function getArticleMetadataBySlug(
  slug: string,
): ArticleFrontmatter | null {
  getMetadataIndex();
  return metadataBySlug?.get(slug) ?? null;
}

export function getAllArticleSlugs(): string[] {
  return getMetadataIndex().map((article) => article.slug);
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
    const frontmatter = data as ArticleFrontmatter;
    return {
      frontmatter: {
        ...frontmatter,
        author: normalizeArticleAuthor(frontmatter.author),
        slug,
      },
      content,
    };
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
  const counts = new Map<string, number>();
  for (const article of getMetadataIndex()) {
    if (!article.category) continue;
    const slug = categoryToSlug(article.category);
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return Array.from(counts.entries()).flatMap(([slug, count]) => {
    const category = getCategoryBySlug(slug);
    return category ? [{ slug, name: category.name, count }] : [];
  });
}

export function getArticlesByCategory(catSlug: string): ArticleFrontmatter[] {
  return getMetadataIndex()
    .filter(
      (article) =>
        article.category && categoryToSlug(article.category) === catSlug,
    )
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}
