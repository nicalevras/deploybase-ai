"use client";

import * as React from "react";
import type { Row } from "@tanstack/react-table";
import type { ModelsColumnSchema } from "./models-schema";
import { useQueries } from "@tanstack/react-query";
import { ChartLegend } from "@/components/charts/chart-legend";
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

const SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--signal))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type TimeseriesPoint = { observedAt: string };

type ThroughputApiResponse = {
  series: {
    data: (TimeseriesPoint & { throughput: number })[];
  }[];
};

type LatencyApiResponse = {
  series: {
    data: (TimeseriesPoint & { latency: number })[];
  }[];
};

async function fetchThroughput(permaslug: string, endpointId: string) {
  const params = new URLSearchParams({ permaslug, endpointId });
  const res = await fetch(`/api/models/throughput?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load throughput (${res.status})`);
  }
  return (await res.json()) as ThroughputApiResponse;
}

async function fetchLatency(permaslug: string, endpointId: string) {
  const params = new URLSearchParams({ permaslug, endpointId });
  const res = await fetch(`/api/models/latency?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load latency (${res.status})`);
  }
  return (await res.json()) as LatencyApiResponse;
}

export function ModelComparisonCharts({
  rows,
  dialogOpen,
}: {
  rows: Row<ModelsColumnSchema>[];
  dialogOpen: boolean;
}) {
  const targets = React.useMemo(() => {
    return rows
      .map((row, index) => {
        const data = row.original as ModelsColumnSchema;
        if (!data.permaslug || !data.endpointId) return null;
        return {
          key: `${data.permaslug}:${data.endpointId}`,
          permaslug: data.permaslug,
          endpointId: data.endpointId,
          label: data.shortName ?? data.name ?? data.permaslug,
          provider: data.provider ?? undefined,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
        };
      })
      .filter((target): target is NonNullable<typeof target> => Boolean(target));
  }, [rows]);

  const throughputQueries = useQueries({
    queries: targets.map((target) => ({
      queryKey: ["model-throughput", target.permaslug, target.endpointId],
      enabled: dialogOpen,
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      queryFn: () => fetchThroughput(target.permaslug, target.endpointId),
    })),
  });

  const latencyQueries = useQueries({
    queries: targets.map((target) => ({
      queryKey: ["model-latency", target.permaslug, target.endpointId],
      enabled: dialogOpen,
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      queryFn: () => fetchLatency(target.permaslug, target.endpointId),
    })),
  });

  const throughputSeries = React.useMemo(() => {
    return targets.map((target, index) => {
      const query = throughputQueries[index];
      const series = query?.data?.series?.[0];
      const points = series?.data ?? [];
      return {
        id: `throughput-${target.key}`,
        label: target.label,
        color: target.color,
        data: points.map((point) => ({
          value: point.throughput,
          observedAt: point.observedAt,
        })),
      };
    });
  }, [targets, throughputQueries]);

  const latencySeries = React.useMemo(() => {
    return targets.map((target, index) => {
      const query = latencyQueries[index];
      const series = query?.data?.series?.[0];
      const points = series?.data ?? [];
      return {
        id: `latency-${target.key}`,
        label: target.label,
        color: target.color,
        data: points.map((point) => ({
          value: point.latency / 1000,
          observedAt: point.observedAt,
        })),
      };
    });
  }, [targets, latencyQueries]);

  const throughputLoading = throughputQueries.some(
    (query) => query.isPending || query.isFetching,
  );
  const latencyLoading = latencyQueries.some(
    (query) => query.isPending || query.isFetching,
  );
  const throughputError = throughputQueries.some((query) => query.isError);
  const latencyError = latencyQueries.some((query) => query.isError);

  const throughputEmptyMessage = !targets.length
    ? "Select models with provider variants to compare throughput."
    : throughputError
      ? "Unable to load throughput data."
      : "No throughput samples yet.";

  const latencyEmptyMessage = !targets.length
    ? "Select models with provider variants to compare latency."
    : latencyError
      ? "Unable to load latency data."
      : "No latency samples yet.";

  const throughputValueFormatter = React.useCallback((value: number) => {
    const formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} tps`;
  }, []);

  const latencyValueFormatter = React.useCallback((value: number) => {
    const formatted = value.toFixed(2);
    return `${formatted}s`;
  }, []);

  const hasTargets = targets.length > 0;

  return (
    <div className="grid gap-4">
      <SheetLineChart
        title="Throughput"
        description={
          hasTargets ? (
            <ChartLegend
              layout="stacked"
              items={targets.map((target) => ({
                id: `throughput-${target.key}`,
                label: target.label,
                provider: target.provider,
                color: target.color,
              }))}
            />
          ) : undefined
        }
        series={throughputSeries}
        isLoading={throughputLoading}
        emptyMessage={throughputEmptyMessage}
        valueLabel="TPS"
        valueFormatter={throughputValueFormatter}
        sourceLabel="Source: OpenRouter"
      />
      <SheetLineChart
        title="Latency"
        description={
          hasTargets ? (
            <ChartLegend
              layout="stacked"
              items={targets.map((target) => ({
                id: `latency-${target.key}`,
                label: target.label,
                provider: target.provider,
                color: target.color,
              }))}
            />
          ) : undefined
        }
        series={latencySeries}
        isLoading={latencyLoading}
        emptyMessage={latencyEmptyMessage}
        valueLabel="seconds"
        valueFormatter={latencyValueFormatter}
        sourceLabel="Source: OpenRouter"
      />
    </div>
  );
}
