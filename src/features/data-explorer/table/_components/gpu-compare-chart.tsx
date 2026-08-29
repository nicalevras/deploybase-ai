"use client";

import * as React from "react";
import type { Row } from "@tanstack/react-table";
import type { ColumnSchema } from "@/features/data-explorer/table/schema";
import { ChartLegend } from "@/components/charts/chart-legend";
import { getProviderDisplayName } from "../provider-logos";
import { useQueries } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const ChartSkeleton = () => (
  <div className="h-36 w-full rounded-md border border-border/60 bg-muted/20" />
);

const SheetLineChart = dynamic(
  () =>
    import("@/components/charts/sheet-line-chart").then(
      (mod) => mod.SheetLineChart,
    ),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

type PriceHistoryPoint = {
  observedAt: string;
  priceUsd: number;
};

type PriceHistoryResponse = {
  stableKey: string;
  series: PriceHistoryPoint[];
};

const SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--signal))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

async function fetchPriceHistory(stableKey: string) {
  const params = new URLSearchParams({ stableKey });
  const res = await fetch(`/api/gpus/price-history?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load GPU price history (${res.status})`);
  }
  return (await res.json()) as PriceHistoryResponse;
}

export function GpuCompareChart({
  rows,
  dialogOpen,
}: {
  rows: Row<ColumnSchema>[];
  dialogOpen: boolean;
}) {
  const normalizeObservedAt = React.useCallback((value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
  }, []);

  const targets = React.useMemo(() => {
    return rows
      .map((row, index) => {
        const data = row.original as ColumnSchema;
        const stableKey = data.stable_key ?? null;
        if (!stableKey) return null;
        const providerName = data.provider
          ? getProviderDisplayName(data.provider)
          : null;
        const baseLabel =
          data.gpu_model ??
          data.item ??
          data.sku ??
          `Configuration ${index + 1}`;
        return {
          stableKey,
          label: baseLabel,
          provider: providerName ?? undefined,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
        };
      })
      .filter((target): target is NonNullable<typeof target> => Boolean(target));
  }, [rows]);

  const historyQueries = useQueries({
    queries: targets.map((target) => ({
      queryKey: ["gpu-price-history", target.stableKey],
      enabled: dialogOpen,
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      queryFn: () => fetchPriceHistory(target.stableKey),
    })),
  });

  const series = React.useMemo(() => {
    return targets.map((target, index) => {
      const data = historyQueries[index]?.data?.series ?? [];
      return {
        id: target.stableKey,
        label: target.label,
        color: target.color,
        data: data.map((point) => ({
          value: point.priceUsd,
          observedAt: normalizeObservedAt(point.observedAt),
        })),
      };
    });
  }, [targets, historyQueries, normalizeObservedAt]);

  const isLoading = historyQueries.some(
    (query) => query.isPending || query.isFetching,
  );
  const hasError = historyQueries.some((query) => query.isError);

  const emptyMessage = !targets.length
    ? "Select configurations with pricing history."
    : hasError
      ? "Unable to load pricing history."
      : "No pricing history yet.";

  const sourceLabel = React.useMemo(() => {
    const uniqueProviders = new Map<string, string>();
    for (const target of targets) {
      const name = target.provider?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!uniqueProviders.has(key)) {
        uniqueProviders.set(key, name);
      }
    }
    if (!uniqueProviders.size) return undefined;
    return `Source: ${Array.from(uniqueProviders.values()).join(", ")}`;
  }, [targets]);

  return (
    <SheetLineChart
      title="Pricing"
      description={
        targets.length ? (
          <ChartLegend
            layout="stacked"
            items={targets.map((target) => ({
              id: target.stableKey,
              label: target.label,
              provider: target.provider,
              color: target.color,
            }))}
          />
        ) : undefined
      }
      series={series}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      valueLabel="USD"
      valueFormatter={(value) => `$${value.toFixed(2)} hr`}
      sourceLabel={sourceLabel}
    />
  );
}
