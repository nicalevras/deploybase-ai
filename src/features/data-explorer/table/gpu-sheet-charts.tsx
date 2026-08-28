"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { getProviderDisplayName } from "./provider-logos";

const ChartSkeleton = () => (
  <div className="h-36 w-full rounded-md border border-border/60 bg-site-chrome" />
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

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const PRICE_WINDOW_DAYS = 30;

type PriceHistoryPoint = {
  observedAt: string;
  priceUsd: number;
};

type PriceHistoryResponse = {
  stableKey: string;
  series: PriceHistoryPoint[];
};

interface GpuSheetChartsProps {
  stableKey?: string | null;
  provider?: string | null;
}

export function GpuSheetCharts({ stableKey, provider }: GpuSheetChartsProps) {
  const enabled = Boolean(stableKey);
  const sourceLabel = React.useMemo(() => {
    if (!provider) return undefined;
    return `Source: ${getProviderDisplayName(provider)}`;
  }, [provider]);

  const normalizeObservedAt = React.useCallback((value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    ).toISOString();
  }, []);

  const historyQuery = useQuery<PriceHistoryResponse>({
    queryKey: ["gpu-price-history", stableKey],
    enabled,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!stableKey) {
        throw new Error("Missing stable key");
      }
      const params = new URLSearchParams({ stableKey });
      const res = await fetch(`/api/gpus/price-history?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load GPU price history (${res.status})`);
      }
      return res.json();
    },
  });

  const chartData = React.useMemo(() => {
    if (!historyQuery.data?.series) {
      return [] as { value: number; observedAt?: string }[];
    }
    return historyQuery.data.series
      .map((point) => ({
        value: point.priceUsd,
        observedAt: normalizeObservedAt(point.observedAt),
      }))
      .sort((a, b) => {
        const aTime = a.observedAt ? Date.parse(a.observedAt) : -Infinity;
        const bTime = b.observedAt ? Date.parse(b.observedAt) : -Infinity;
        return aTime - bTime;
      });
  }, [historyQuery.data, normalizeObservedAt]);

  const priceChangeSummary = React.useMemo(() => {
    if (chartData.length < 2) return null;

    const getTimestamp = (value?: string) => {
      if (!value) return undefined;
      const time = Date.parse(value);
      return Number.isNaN(time) ? undefined : time;
    };

    const latestTime = getTimestamp(chartData[chartData.length - 1].observedAt);
    if (latestTime == null) return null;

    const windowStartTime = latestTime - PRICE_WINDOW_DAYS * MS_IN_DAY;
    let windowPoints = chartData.filter((point) => {
      const ts = getTimestamp(point.observedAt);
      return ts != null && ts >= windowStartTime;
    });

    if (windowPoints.length < 2) {
      windowPoints = chartData;
    }

    if (windowPoints.length < 2) return null;

    const startPoint = windowPoints[0];
    const endPoint = windowPoints[windowPoints.length - 1];
    const startTime = getTimestamp(startPoint.observedAt) ?? latestTime;
    const endTime = getTimestamp(endPoint.observedAt) ?? latestTime;

    const rawDays = (endTime - startTime) / MS_IN_DAY;
    const daysCovered = Math.max(1, Math.round(rawDays));
    const change = endPoint.value - startPoint.value;
    const percent =
      startPoint.value !== 0 ? (change / startPoint.value) * 100 : null;

    return {
      change,
      percent,
      days: Math.min(daysCovered, PRICE_WINDOW_DAYS),
    };
  }, [chartData]);

  const priceChangeDescription = React.useMemo(() => {
    if (!priceChangeSummary) {
      return "30d change";
    }

    const { change, percent } = priceChangeSummary;
    const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";

    if (direction === "flat") {
      const formattedPercent = `${(percent ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

      return (
        <div className="flex items-center gap-1 text-xs text-foreground">
          <span className="text-foreground/70">30d change</span>
          <span className="font-medium text-foreground">({formattedPercent})</span>
        </div>
      );
    }
    const changeColorClass =
      direction === "down"
        ? "text-[hsl(var(--chart-3))]"
        : direction === "up"
          ? "text-[hsl(var(--chart-2))]"
          : "text-foreground/70";
    const symbol =
      direction === "up" ? "▲" : direction === "down" ? "▼" : null;
    const percentText =
      percent == null
        ? null
        : `${percent.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%`;

    return (
      <div className="flex items-center gap-1 text-xs text-foreground">
        <span className="text-foreground/70">30d change</span>
        {symbol ? <span className={changeColorClass}>{symbol}</span> : null}
        <span className={`${changeColorClass} font-medium`}>
          ({percentText ?? "N/A"})
        </span>
      </div>
    );
  }, [priceChangeSummary]);

  const emptyMessage = !stableKey
    ? "Select a configuration to load pricing history."
    : historyQuery.isError
      ? "Unable to load pricing history."
      : "No pricing history yet.";

  const isLoading =
    historyQuery.fetchStatus === "fetching" && !historyQuery.data;

  return (
    <SheetLineChart
      title="Pricing"
      description={priceChangeDescription}
      data={chartData}
      stroke="hsl(var(--signal))"
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      valueLabel="USD"
      valueFormatter={(value) => `$${value.toFixed(2)} hr`}
      sourceLabel={sourceLabel}
    />
  );
}
