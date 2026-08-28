import { Terminal } from "lucide-react";
import { AppHeaderNavigation } from "@/components/site/app-header";
import { Brand } from "@/components/site/brand";
import { ActiveHeaderLink } from "@/components/site/active-header-link";

const NAV_ITEMS = [
  { label: "Home", href: "/", exact: true },
  { label: "GPUs", href: "/gpus" },
  { label: "LLMs", href: "/llms" },
  { label: "MLOps", href: "/tools" },
  { label: "Research", href: "/articles" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-[var(--app-header-height)] bg-site-chrome">
      <a
        href="https://github.com/nicalevras/deploybase-cli"
        target="_blank"
        rel="noreferrer"
        className="block h-[var(--announcement-bar-height)] border-b border-border bg-accent/55 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-center gap-2 px-3 text-xs font-medium sm:gap-3 sm:px-8">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-signal">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            Deploybase CLI
          </span>
          <span className="border-l border-signal/25 pl-2 leading-tight text-muted-foreground sm:pl-3">
            <span className="min-[425px]:hidden">
              GPU + LLM pricing in your terminal.
            </span>
            <span className="hidden min-[425px]:inline">
              Compare GPU and LLM pricing from your terminal.
            </span>
          </span>
        </span>
      </a>
      <AppHeaderNavigation
        brand={<Brand />}
        desktopNavigation={
          <nav
            className="hidden h-full items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => (
              <ActiveHeaderLink key={item.href} {...item} />
            ))}
          </nav>
        }
      />
    </header>
  );
}
