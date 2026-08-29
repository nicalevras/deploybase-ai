"use client";

import { Input } from "@/components/ui/input";
import {
  createRetryableLoader,
  type RetryableLoader,
} from "@/lib/research/retryable-loader";
import { fetchResearchSelection } from "@/lib/research/selection-request";
import type {
  GpuChartPayload,
  HomepageResearchManifest,
  LlmChartPayload,
  ResearchOption,
} from "@/lib/research/types";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";
import { ResearchSurfaceSkeleton } from "./research-surface-skeleton";

type GpuChartComponent = React.ComponentType<{
  payload: GpuChartPayload;
  className?: string;
}>;
type LlmChartComponent = React.ComponentType<{
  payload: LlmChartPayload;
  className?: string;
}>;

const gpuChartLoader = createRetryableLoader(() =>
  import("./gpu-market-chart").then((module) => module.GpuMarketChart),
);
const llmChartLoader = createRetryableLoader(() =>
  import("./llm-market-chart").then((module) => module.LlmMarketChart),
);

function useDeferredChart<TProps>(
  active: boolean,
  loader: RetryableLoader<React.ComponentType<TProps>>,
) {
  const [Chart, setChart] = React.useState<React.ComponentType<TProps> | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!active || Chart) return;
    let cancelled = false;
    setLoadError(false);
    loader
      .load()
      .then((component) => {
        if (!cancelled) setChart(() => component);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [active, attempt, Chart, loader]);

  const retry = React.useCallback(() => {
    loader.reset();
    setChart(null);
    setLoadError(false);
    setAttempt((current) => current + 1);
  }, [loader]);

  return { Chart, loadError, retry };
}

function Control({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ResearchOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;
  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <div className="w-full min-w-0 sm:w-64">
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverPrimitive.Trigger
          type="button"
          aria-label={label}
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between gap-3 rounded-sm border border-input bg-site-chrome py-2 pl-3 pr-2 text-sm font-medium normal-case text-foreground shadow-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15"
        >
          <span className="min-w-0 truncate">{selectedLabel || label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-foreground/70" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-none"
          >
            <div className="relative border-b border-border p-1.5">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                aria-label={`Search ${label}`}
                className="h-9 border-0 bg-transparent pl-8 pr-8 shadow-none focus-visible:border-transparent focus-visible:ring-0"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={`Clear ${label} search`}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/20"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-normal normal-case text-foreground outline-none hover:bg-muted focus-visible:bg-muted",
                      option.value === value && "bg-muted/60",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm font-normal normal-case text-muted-foreground">
                  No results found.
                </p>
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

function ResearchSurfaceError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="research-surface mt-8 flex h-[360px] flex-col items-center justify-center gap-3 px-5 text-center text-sm text-muted-foreground sm:h-[420px] lg:h-[520px]">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center justify-center rounded-sm border border-input bg-site-chrome px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

function useNearViewport() {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!element || active) return;
    if (!("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, element]);

  return [setElement, active] as const;
}

function useSelectionPayload<TPayload>(
  initialKey: string,
  initialPayload: TPayload,
  endpoint: string,
  parameter: string,
) {
  const [selection, setSelection] = React.useState(initialKey);
  const [payload, setPayload] = React.useState(initialPayload);
  const [loading, setLoading] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [error, setError] = React.useState(false);
  const cacheRef = React.useRef(new Map([[initialKey, initialPayload]]));
  const requestRef = React.useRef<AbortController | null>(null);
  const skeletonTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const select = React.useCallback(
    (key: string) => {
      setSelection(key);
      setError(false);
      requestRef.current?.abort();
      requestRef.current = null;
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
        skeletonTimerRef.current = null;
      }
      const cached = cacheRef.current.get(key);
      if (cached) {
        setPayload(cached);
        setLoading(false);
        setShowSkeleton(false);
        return;
      }
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      // Only swap to the skeleton for slow fetches; fast (cached/server-warm)
      // selections keep the current chart on screen to avoid a flash.
      skeletonTimerRef.current = setTimeout(() => {
        if (requestRef.current === controller) setShowSkeleton(true);
      }, 175);
      fetchResearchSelection<TPayload>(
        fetch,
        endpoint,
        parameter,
        key,
        controller.signal,
      )
        .then((nextPayload) => {
          cacheRef.current.set(key, nextPayload);
          setPayload(nextPayload);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError")
            return;
          setError(true);
        })
        .finally(() => {
          if (requestRef.current === controller) {
            setLoading(false);
            setShowSkeleton(false);
            if (skeletonTimerRef.current) {
              clearTimeout(skeletonTimerRef.current);
              skeletonTimerRef.current = null;
            }
          }
        });
    },
    [endpoint, parameter],
  );

  React.useEffect(
    () => () => {
      requestRef.current?.abort();
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    },
    [],
  );
  const retry = React.useCallback(() => select(selection), [select, selection]);
  return { selection, payload, loading, showSkeleton, error, select, retry };
}

export function GpuMarketController({
  options,
  initial,
}: HomepageResearchManifest["gpu"]) {
  const state = useSelectionPayload<GpuChartPayload>(
    initial.model,
    initial,
    "/api/research/gpus",
    "model",
  );
  const [setViewportElement, isNearViewport] = useNearViewport();
  const chart = useDeferredChart(isNearViewport, gpuChartLoader);
  const Chart = chart.Chart;

  return (
    <div className="contents">
      <div className="z-10 col-start-1 row-start-2 mt-[42px] w-full min-w-0 justify-self-start sm:col-start-2 sm:row-start-1 sm:mt-[22px] sm:w-64 sm:self-end sm:justify-self-end">
        <Control
          label="GPU model"
          value={state.selection}
          onChange={state.select}
          options={options}
        />
      </div>
      <div
        ref={setViewportElement}
        className="col-start-1 row-start-3 min-w-0 sm:col-span-2 sm:row-start-2"
      >
        {state.error ? (
          <ResearchSurfaceError
            message="GPU research data is temporarily unavailable."
            onRetry={state.retry}
          />
        ) : chart.loadError ? (
          <ResearchSurfaceError
            message="The GPU chart could not be loaded."
            onRetry={chart.retry}
          />
        ) : state.showSkeleton || !isNearViewport || !Chart ? (
          <ResearchSurfaceSkeleton kind="gpu" />
        ) : state.payload.offers.length ? (
          <Chart
            payload={state.payload}
            className={cn(
              "transition-opacity duration-150",
              state.loading && "opacity-60",
            )}
          />
        ) : (
          <ResearchSurfaceError message="GPU pricing data is temporarily unavailable." />
        )}
      </div>
    </div>
  );
}

export function LlmMarketController({
  options,
  initial,
}: HomepageResearchManifest["llm"]) {
  const state = useSelectionPayload<LlmChartPayload>(
    initial.selection,
    initial,
    "/api/research/llms",
    "permaslug",
  );
  const [setViewportElement, isNearViewport] = useNearViewport();
  const chart = useDeferredChart(isNearViewport, llmChartLoader);
  const Chart = chart.Chart;

  return (
    <div className="contents">
      <div className="z-10 col-start-1 row-start-2 mt-[42px] w-full min-w-0 justify-self-start sm:col-start-2 sm:row-start-1 sm:mt-[22px] sm:w-64 sm:self-end sm:justify-self-end">
        <Control
          label="LLM model"
          value={state.selection}
          onChange={state.select}
          options={options}
        />
      </div>
      <div
        ref={setViewportElement}
        className="col-start-1 row-start-3 min-w-0 sm:col-span-2 sm:row-start-2"
      >
        {state.error ? (
          <ResearchSurfaceError
            message="LLM research data is temporarily unavailable."
            onRetry={state.retry}
          />
        ) : chart.loadError ? (
          <ResearchSurfaceError
            message="The LLM chart could not be loaded."
            onRetry={chart.retry}
          />
        ) : state.showSkeleton || !isNearViewport || !Chart ? (
          <ResearchSurfaceSkeleton kind="llm" />
        ) : state.payload.endpoints.length ? (
          <Chart
            payload={state.payload}
            className={cn(
              "transition-opacity duration-150",
              state.loading && "opacity-60",
            )}
          />
        ) : (
          <ResearchSurfaceError message="LLM performance data is temporarily unavailable." />
        )}
      </div>
    </div>
  );
}
