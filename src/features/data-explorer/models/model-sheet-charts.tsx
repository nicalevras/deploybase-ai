"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { formatThroughputDisplay } from "./models-constants";

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

type TimeseriesPoint = { observedAt: string };

type ThroughputApiResponse = {
  permaslug: string;
  endpointId: string | null;
  series: {
    endpointId: string;
    provider?: string | null;
    data: (TimeseriesPoint & { throughput: number })[];
  }[];
};

type LatencyApiResponse = {
  permaslug: string;
  endpointId: string | null;
  series: {
    endpointId: string;
    provider?: string | null;
    data: (TimeseriesPoint & { latency: number })[];
  }[];
};

type ModelSheetChartsProps = {
  permaslug?: string | null;
  endpointId?: string | null;
  provider?: string | null;
  throughput?: number | null;
};

export function ModelSheetCharts({
  permaslug,
  endpointId,
  provider,
  throughput,
}: ModelSheetChartsProps) {
  const enabled = Boolean(permaslug && endpointId);

  const throughputQuery = useQuery<ThroughputApiResponse>({
    queryKey: ["model-throughput", permaslug, endpointId],
    enabled,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!permaslug || !endpointId) {
        throw new Error("Missing throughput identifiers");
      }
      const params = new URLSearchParams({ permaslug, endpointId });
      const res = await fetch(`/api/models/throughput?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load throughput (${res.status})`);
      }
      return res.json();
    },
  });

  const latencyQuery = useQuery<LatencyApiResponse>({
    queryKey: ["model-latency", permaslug, endpointId],
    enabled,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!permaslug || !endpointId) {
        throw new Error("Missing latency identifiers");
      }
      const params = new URLSearchParams({ permaslug, endpointId });
      const res = await fetch(`/api/models/latency?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load latency (${res.status})`);
      }
      return res.json();
    },
  });

  const throughputData = React.useMemo(() => {
    const series = throughputQuery.data?.series?.[0];
    if (!series || !Array.isArray(series.data)) {
      return [] as { value: number; observedAt?: string }[];
    }

    return series.data.map((point) => ({
      value: point.throughput,
      observedAt: point.observedAt,
    }));
  }, [throughputQuery.data]);

  const latencyData = React.useMemo(() => {
    const series = latencyQuery.data?.series?.[0];
    if (!series || !Array.isArray(series.data)) {
      return [] as { value: number; observedAt?: string }[];
    }

    return series.data.map((point) => ({
      value: point.latency / 1000,
      observedAt: point.observedAt,
    }));
  }, [latencyQuery.data]);

  const latencyAverage = React.useMemo(() => {
    if (!latencyData.length) {
      return null;
    }
    const sum = latencyData.reduce((total, point) => total + point.value, 0);
    return sum / latencyData.length;
  }, [latencyData]);

  const latencyValueFormatter = React.useCallback((value: number) => {
    const formatted = value.toFixed(2);
    return `${formatted}s`;
  }, []);

  const throughputValueFormatter = React.useCallback((value: number) => {
    const formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} tps`;
  }, []);

  const latencyDescription = latencyAverage != null
    ? `${latencyAverage.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}s`
    : "";
  const throughputDescription = React.useMemo(() => {
    const formatted = formatThroughputDisplay(throughput ?? null);
    if (formatted === "N/A") {
      return "";
    }
    return formatted;
  }, [throughput]);
  const missingSelection = !permaslug || !endpointId;
  const emptyMessage = missingSelection
    ? "Select a provider variant to load throughput."
    : throughputQuery.isError
      ? "Unable to load throughput data."
      : "No throughput samples yet.";
  const latencyEmptyMessage = missingSelection
    ? "Select a provider variant to load latency."
    : latencyQuery.isError
      ? "Unable to load latency data."
      : "No latency samples yet.";

  return (
    <div className="grid gap-4">
      <SheetLineChart
        title="Throughput"
        description={throughputDescription}
        data={throughputData}
        stroke="hsl(var(--chart-1))"
        isLoading={throughputQuery.isPending || throughputQuery.isFetching}
        emptyMessage={emptyMessage}
        valueLabel="TPS"
        valueFormatter={throughputValueFormatter}
        sourceLabel="Source: OpenRouter"
      />
      <SheetLineChart
        title="Latency"
        description={latencyDescription}
        data={latencyData}
        stroke="hsl(var(--signal))"
        isLoading={latencyQuery.isPending || latencyQuery.isFetching}
        emptyMessage={latencyEmptyMessage}
        valueFormatter={latencyValueFormatter}
        valueLabel="seconds"
        sourceLabel="Source: OpenRouter"
      />
    </div>
  );
}
