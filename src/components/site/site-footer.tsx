import Link from "next/link";
import { Brand } from "@/components/site/brand";

const LINKS = [
  ["GPUs", "/gpus"],
  ["LLMs", "/llms"],
  ["MLOps", "/tools"],
  ["Research", "/articles"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-site-chrome">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <Brand />
          <p className="max-w-md text-sm text-muted-foreground">
            Live GPU cloud and LLM API pricing, performance benchmarks, and
            market data across leading AI infrastructure providers.
          </p>
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Deploybase. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} prefetch={false} className="text-sm text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
