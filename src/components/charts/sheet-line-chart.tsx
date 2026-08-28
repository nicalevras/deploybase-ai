"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type SheetLineSeries = {
  id: string;
  label: string;
  color?: string;
  data: { value: number; observedAt?: string }[];
};

export type SheetLineChartProps = {
  title: string;
  description?: React.ReactNode;
  stroke?: string;
  data?: { value: number; observedAt?: string }[];
  series?: SheetLineSeries[];
  isLoading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  sourceLabel?: string;
};

export function SheetLineChart({
  title,
  description,
  stroke = "hsl(var(--chart-1))",
  data,
  series,
  isLoading,
  emptyMessage,
  valueFormatter,
  valueLabel,
  sourceLabel,
}: SheetLineChartProps) {
  const descriptionContent = React.useMemo(() => {
    if (!description) return null;
    if (typeof description === "string") {
      return (
        <CardDescription className="text-xs text-foreground/70">
          {description}
        </CardDescription>
      );
    }
    return <div className="text-xs text-foreground/70">{description}</div>;
  }, [description]);

  const resolvedSeries = React.useMemo<SheetLineSeries[]>(() => {
    if (series && series.length > 0) {
      return series.map((item, index) => ({
        id: item.id ?? `series-${index}`,
        label: item.label ?? `Series ${index + 1}`,
        color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        data: item.data ?? [],
      }));
    }

    if (data) {
      return [
        {
          id: "value",
          label: valueLabel ?? "value",
          color: stroke,
          data,
        },
      ];
    }

    return [];
  }, [data, series, stroke, valueLabel]);

  const formatLabel = React.useCallback((payload?: Array<{ payload?: { observedAt?: string } }>, fallbackLabel?: string | number) => {
    const raw = (payload?.[0]?.payload?.observedAt as string | undefined) ?? (typeof fallbackLabel === "string" ? fallbackLabel : undefined);
    if (!raw) return "";
    const iso = raw.endsWith("Z") ? raw : `${raw}Z`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, []);

  const mergedData = React.useMemo(() => {
    const pointMap = new Map<string, { observedAt: string } & Record<string, string | number>>();

    resolvedSeries.forEach((series) => {
      series.data.forEach((point, index) => {
        const key = point.observedAt ?? `${series.id}-${index}`;
        let entry = pointMap.get(key);
        if (!entry) {
          entry = { observedAt: point.observedAt ?? key };
          pointMap.set(key, entry);
        }
        entry[series.id] = point.value;
      });
    });

    return Array.from(pointMap.values()).sort((a, b) => {
      const aTime = Date.parse(a.observedAt);
      const bTime = Date.parse(b.observedAt);
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return String(a.observedAt).localeCompare(String(b.observedAt));
      }
      return aTime - bTime;
    });
  }, [resolvedSeries]);

  const showEmpty =
    !isLoading && resolvedSeries.every((series) => (series.data?.length ?? 0) === 0);

  const linearDomain = React.useMemo(() => {
    const values = resolvedSeries.flatMap((series) =>
      series.data
        .map((point) => point.value)
        .filter((value) => Number.isFinite(value)),
    );

    if (!values.length) {
      return [0, 1] as [number, number];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const padding = min * 0.1 || 0.1;
      return [min - padding, max + padding] as [number, number];
    }

    const padding = (max - min) * 0.11 || 0.11;
    return [min - padding, max + padding] as [number, number];
  }, [resolvedSeries]);

  const yTicks = React.useMemo(() => {
    const [min, max] = linearDomain;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
    if (max === min) return [min];
    const count = 4;
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, index) => min + step * index);
  }, [linearDomain]);

  return (
    <Card className="border-border/60 bg-site-chrome shadow-none">
      <CardHeader className="space-y-1.5 p-4 pb-1">
        <CardTitle className="text-sm font-medium text-foreground">
          {title}
        </CardTitle>
        {descriptionContent}
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-1">
          <div className="h-36 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : showEmpty ? (
              <div className="flex h-full items-center justify-center text-xs text-foreground/70">
                {emptyMessage ?? "No data available."}
              </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <YAxis
                  hide
                  domain={linearDomain}
                  ticks={yTicks}
                  tickCount={yTicks?.length ?? 5}
                  padding={{ top: 8, bottom: 8 }}
                />
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  syncWithTicks
                />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                    labelFormatter={(label, payload) => formatLabel(payload, label)}
                    content={({ payload, label }) => {
                      if (!payload?.length) return null;
                      return (
                        <div
                          className="recharts-default-tooltip"
                          style={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            padding: "0.5rem 0.75rem",
                          }}
                        >
                          <div className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                            {formatLabel(payload as Array<{ payload?: { observedAt?: string } }>, label as string | number)}
                          </div>
                          <div className="recharts-tooltip-item-list mt-1 flex flex-col gap-1">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: entry.color ?? stroke }}
                                />
                                <span className="font-mono">
                                  {valueFormatter
                                    ? valueFormatter(entry.value as number)
                                    : (entry.value as number).toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      })}
                                </span>
                          </div>
                        ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                {resolvedSeries.map((series, index) => (
                  <Line
                    key={series.id}
                    type="monotone"
                    dot={false}
                    dataKey={series.id}
                    stroke={series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    strokeWidth={2}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {sourceLabel ? (
            <div className="text-right text-[10px] text-foreground/50">
              {sourceLabel}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
