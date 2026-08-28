import type { ArticleFrontmatter } from "@/lib/articles-loader";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ArticleCollection({
  eyebrow,
  title,
  description,
  articles,
  continuation,
  emptyMessage = "No matching research found.",
}: {
  eyebrow: string;
  title: string;
  description: string;
  articles: ArticleFrontmatter[];
  continuation: { label: string; href: string };
  emptyMessage?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link
          href="/articles"
          prefetch={false}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Research
        </Link>
      </nav>
      <header className="mt-8 grid gap-6 border-b border-border pb-9 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold text-signal">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="numeric text-sm text-muted-foreground">
          {articles.length} articles
        </div>
      </header>
      {articles.length ? (
        <div className="divide-y divide-border">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="grid gap-3 py-6 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-start"
            >
              <time
                className="numeric text-xs text-muted-foreground"
                dateTime={article.date}
              >
                {new Date(article.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <div>
                <h2 className="text-lg font-semibold leading-snug">
                  <Link
                    href={`/articles/${article.slug}`}
                    prefetch={false}
                    className="hover:text-signal"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {article.description}
                </p>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </article>
          ))}
        </div>
      ) : (
        <div className="border-b border-border py-12 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        <span className="text-sm text-muted-foreground">
          Continue exploring
        </span>
        <Link
          href={continuation.href}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-signal"
        >
          {continuation.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
