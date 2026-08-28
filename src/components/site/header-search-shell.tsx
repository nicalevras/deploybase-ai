"use client";

import { HeaderSearchInput } from "@/components/site/header-search-input";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

type ExplorerDomain = "gpus" | "llms" | "tools";
type FederatedSearchComponent = React.ComponentType<{
  className?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}>;

function getExplorerDomain(pathname: string): ExplorerDomain | null {
  if (pathname.startsWith("/gpus")) return "gpus";
  if (pathname.startsWith("/llms")) return "llms";
  if (pathname.startsWith("/tools")) return "tools";
  return null;
}

export function HeaderSearch({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const domain = getExplorerDomain(pathname);
  if (domain) return <DomainSearch domain={domain} className={className} />;
  if (pathname === "/" || pathname.startsWith("/articles")) {
    return <DeferredFederatedSearch className={className} />;
  }
  return null;
}

export function HeaderSearchFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-9 w-full rounded-sm border border-input bg-site-chrome",
        className,
      )}
      aria-hidden="true"
    />
  );
}

function DomainSearch({
  domain,
  className,
}: {
  domain: ExplorerDomain;
  className?: string;
}) {
  const pathname = usePathname() ?? `/${domain}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("search") ?? "";
  const [value, setValue] = React.useState(urlValue);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setValue(urlValue), [urlValue]);
  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const applyValue = React.useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = nextValue.trim();
      if (normalized) params.set("search", normalized);
      else params.delete("search");
      params.delete("cursor");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  const handleChange = React.useCallback(
    (nextValue: string) => {
      setValue(nextValue);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => applyValue(nextValue), 400);
    },
    [applyValue],
  );
  const label =
    domain === "gpus" ? "GPUs" : domain === "llms" ? "LLMs" : "MLOps";

  return (
    <div className={cn("w-full", className)}>
      <HeaderSearchInput
        value={value}
        placeholder={`Search ${label}`}
        onChange={handleChange}
        onClear={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setValue("");
          applyValue("");
        }}
      />
    </div>
  );
}

function DeferredFederatedSearch({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const urlQuery =
    pathname === "/articles/search" ? searchParams.get("search") ?? "" : "";
  const [value, setValue] = React.useState(urlQuery);
  const [SearchController, setSearchController] = React.useState<
    FederatedSearchComponent | null
  >(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => setValue(urlQuery), [urlQuery]);

  const activate = React.useCallback(() => {
    if (loadingRef.current || SearchController) return;
    loadingRef.current = true;
    import("./header-search")
      .then((module) => {
        setSearchController(() => module.FederatedSearch);
      })
      .catch(() => {
        loadingRef.current = false;
      });
  }, [SearchController]);

  if (SearchController) {
    return (
      <SearchController
        className={className}
        initialQuery={value}
        autoFocus
      />
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <HeaderSearchInput
        value={value}
        placeholder="Search"
        onFocus={activate}
        onChange={(nextValue) => {
          setValue(nextValue);
          activate();
        }}
        onClear={() => setValue("")}
      />
    </div>
  );
}
