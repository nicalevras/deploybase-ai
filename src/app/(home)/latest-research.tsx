import { getAllArticleMetadata } from "@/lib/articles-loader";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function LatestResearch() {
  const articles = getAllArticleMetadata()
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .slice(0, 6);

  return (
    <section>
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        <section
          aria-labelledby="latest-research-title"
          className="border-t border-border pb-0 pt-8 sm:pb-16"
        >
          <div className="flex items-end justify-between pb-0 sm:pb-5">
            <div>
              <p className="research-kicker">Articles</p>
              <h2
                id="latest-research-title"
                className="mt-2 text-3xl font-semibold tracking-tighter sm:text-4xl"
              >
                Latest research
              </h2>
            </div>
            <Link
              href="/articles"
              prefetch={false}
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-signal"
            >
              All research <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                prefetch={false}
                className={cn(
                  "block h-full py-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  index < articles.length - 1 && "border-b border-border",
                  index < articles.length - 2 ? "sm:border-b" : "sm:border-b-0",
                  index < articles.length - 3 ? "lg:border-b" : "lg:border-b-0",
                  index % 2 === 0
                    ? "sm:border-r sm:pl-0 sm:pr-6"
                    : "sm:border-r-0 sm:pl-6 sm:pr-0",
                  index % 3 === 0
                    ? "lg:border-r lg:pl-0 lg:pr-8"
                    : index % 3 === 2
                      ? "lg:border-r-0 lg:pl-8 lg:pr-0"
                      : "lg:border-r lg:px-8",
                )}
              >
                <article className="flex h-full flex-col">
                  <div className="text-[11px] font-semibold uppercase text-signal">
                    {article.category}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-snug">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {article.description}
                  </p>
                  <time
                    className="mt-auto block pt-4 text-xs text-muted-foreground"
                    dateTime={article.date}
                  >
                    {new Date(article.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
