"use client";

import { HeaderSearchInput } from "@/components/site/header-search-input";
import { ModelMark, ProviderMark } from "@/components/site/provider-mark";
import type {
  FederatedSearchResponse,
  HeaderSearchResult,
  HeaderSearchSection,
} from "@/lib/search-types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  FileText,
  LoaderCircle,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const SECTION_ORDER = ["gpus", "llms", "tools", "articles"] as const;

function optionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`;
}

export function FederatedSearch({
  className,
  initialQuery,
  autoFocus,
}: {
  className?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const generatedId = React.useId();
  const listboxId = `federated-search-${generatedId.replaceAll(":", "")}`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const urlQuery = pathname === "/articles/search"
    ? searchParams.get("search") ?? ""
    : "";
  const [query, setQuery] = React.useState(initialQuery ?? urlQuery);
  const [response, setResponse] = React.useState<FederatedSearchResponse | null>(
    null,
  );
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [open, setOpen] = React.useState(
    () => (initialQuery?.trim().length ?? 0) >= 2,
  );
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const previousUrlQueryRef = React.useRef(urlQuery);

  React.useEffect(() => {
    if (previousUrlQueryRef.current === urlQuery) return;
    previousUrlQueryRef.current = urlQuery;
    setQuery(urlQuery);
    setOpen(false);
  }, [urlQuery]);

  const results = React.useMemo(
    () =>
      response
        ? SECTION_ORDER.flatMap((key) => response.sections[key].results)
        : [],
    [response],
  );

  React.useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResponse(null);
      setStatus("idle");
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setStatus("loading");
      try {
        const request = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        if (!request.ok) throw new Error(`Search failed with ${request.status}`);
        const payload = (await request.json()) as FederatedSearchResponse;
        setResponse(payload);
        setStatus("ready");
        setActiveIndex(-1);
      } catch {
        if (controller.signal.aborted) return;
        setResponse(null);
        setStatus("error");
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      setOpen(false);
      router.push(results[activeIndex].href);
    } else if (
      event.key === "Enter" &&
      pathname.startsWith("/articles") &&
      query.trim().length >= 2
    ) {
      event.preventDefault();
      setOpen(false);
      router.push(
        `/articles/search?search=${encodeURIComponent(query.trim())}`,
      );
    }
  };

  let resultOffset = 0;
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <HeaderSearchInput
        value={query}
        placeholder="Search"
        onChange={(value) => {
          setQuery(value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onClear={() => {
          setQuery("");
          setResponse(null);
          setOpen(false);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        expanded={showDropdown}
        listboxId={listboxId}
        activeDescendant={
          activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined
        }
        combobox
        autoFocus={autoFocus}
      />

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] max-h-[min(70vh,42rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {status === "loading" ? (
            <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Searching
            </div>
          ) : null}

          {status === "error" ? (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
              Search is temporarily unavailable.
            </div>
          ) : null}

          {status === "ready" && response ? (
            <div className="grid md:grid-cols-2">
              {SECTION_ORDER.map((key, sectionIndex) => {
                const section = response.sections[key];
                const sectionStart = resultOffset;
                resultOffset += section.results.length;
                return (
                  <SearchSection
                    key={key}
                    section={section}
                    sectionIndex={sectionIndex}
                    activeIndex={activeIndex}
                    resultOffset={sectionStart}
                    listboxId={listboxId}
                    onActivate={setActiveIndex}
                    onNavigate={() => setOpen(false)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchSection({
  section,
  sectionIndex,
  activeIndex,
  resultOffset,
  listboxId,
  onActivate,
  onNavigate,
}: {
  section: HeaderSearchSection;
  sectionIndex: number;
  activeIndex: number;
  resultOffset: number;
  listboxId: string;
  onActivate: (index: number) => void;
  onNavigate: () => void;
}) {
  return (
    <section
      role="group"
      aria-labelledby={`${listboxId}-section-${sectionIndex}`}
      className={cn(
        "min-w-0 border-b border-border p-3",
        sectionIndex % 2 === 0 && "md:border-r",
      )}
    >
      <div className="flex h-7 items-center justify-between px-2">
        <h2
          id={`${listboxId}-section-${sectionIndex}`}
          className="text-[11px] font-semibold uppercase text-muted-foreground"
        >
          {section.label}
        </h2>
        <span className="numeric text-[10px] text-muted-foreground">
          {section.total.toLocaleString()}
        </span>
      </div>
      <div>
        {section.results.length ? (
          section.results.map((result, index) => {
            const absoluteIndex = resultOffset + index;
            return (
              <Link
                key={result.id}
                id={optionId(listboxId, absoluteIndex)}
                href={result.href}
                prefetch={false}
                role="option"
                aria-selected={activeIndex === absoluteIndex}
                onMouseEnter={() => onActivate(absoluteIndex)}
                onFocus={() => onActivate(absoluteIndex)}
                onClick={onNavigate}
                className={cn(
                  "grid min-h-14 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
                  activeIndex === absoluteIndex && "bg-accent",
                )}
              >
                <SearchResultMark result={result} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {result.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {result.description}
                  </span>
                </span>
              </Link>
            );
          })
        ) : (
          <div className="flex h-14 items-center px-2 text-xs text-muted-foreground">
            No matches
          </div>
        )}
      </div>
      <Link
        href={section.viewAllHref}
        prefetch={false}
        onClick={onNavigate}
        className="mt-1 flex h-8 items-center justify-between rounded px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View all {section.label.toLowerCase()}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function SearchResultMark({ result }: { result: HeaderSearchResult }) {
  if (result.kind === "gpu" && result.provider) {
    return <ProviderMark provider={result.provider} domain="gpu" size={24} />;
  }

  if (result.kind === "llm" && result.model && result.author) {
    return <ModelMark model={result.model} author={result.author} size={24} />;
  }

  const Icon = result.kind === "tool" ? Wrench : FileText;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
