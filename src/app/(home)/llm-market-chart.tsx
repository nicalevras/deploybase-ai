"use client";

import { ModelMark, ProviderMark } from "@/components/site/provider-mark";
import { getProviderColor } from "@/lib/provider-branding";
import {
  buildEscalatingPriceAxis,
  buildThroughputAxis,
} from "@/lib/research/chart-math";
import type {
  LlmChartEndpoint,
  LlmChartPayload,
} from "@/lib/research/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as React from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ChartTooltip,
  LlmTooltipDetails,
  chartGrid,
  formatCurrencyTick,
  useAnchoredTooltip,
  useElementWidth,
  useMediaQuery,
} from "./research-chart-shared";
import {
  chartYAxisWidth,
  llmChartMargin,
  researchPlotPanelClassName,
  researchRailClassName,
  researchRailRowClassName,
  researchSurfaceClassName,
} from "./research-chart-layout";

type LlmScatterDatum = LlmChartEndpoint & {
  plotPrice: number;
  plotThroughput: number;
  plotLabel: string;
  labelKind: "model" | "provider";
  labelOnLeft: boolean;
  labelVertical: "above" | "middle" | "below";
  isClusterTop: boolean;
};

const labelHeight = 28;

function LlmScatterPoint({
  cx = 0,
  cy = 0,
  fill = "hsl(var(--signal))",
  payload,
  hoveredId,
  onHover,
  showLabel,
  containerWidth,
  registerPoint,
}: {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: LlmScatterDatum;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  showLabel?: boolean;
  containerWidth?: number;
  registerPoint?: (id: string, element: SVGCircleElement | null) => void;
}) {
  const isHovered = payload?.id === hoveredId;
  const isMuted = Boolean(payload && hoveredId && !isHovered);
  const useCompactLabel = !showLabel;
  const activeLabelWidth = useCompactLabel ? 108 : 148;
  const labelOnLeft = payload?.labelOnLeft ?? false;
  const labelWouldOverflowLeft = cx - activeLabelWidth - 8 < 0;
  const labelWouldOverflowRight = containerWidth
    ? cx + activeLabelWidth + 8 > containerWidth
    : false;
  const resolvedLabelOnLeft = labelOnLeft
    ? !labelWouldOverflowLeft
    : labelWouldOverflowRight && !labelWouldOverflowLeft;
  const labelY =
    payload?.labelVertical === "above"
      ? cy - 34
      : payload?.labelVertical === "below"
        ? cy + 6
        : cy - 13;

  return (
    <g
      onMouseEnter={() => onHover?.(payload?.id ?? null)}
      onMouseLeave={() => onHover?.(null)}
    >
      <circle
        ref={(element) => {
          if (payload?.id) registerPoint?.(payload.id, element);
        }}
        cx={cx}
        cy={cy}
        r={isHovered ? 7 : 4.5}
        fill={fill}
        stroke={isHovered ? chartGrid : "white"}
        strokeWidth={isHovered ? 2 : 1.5}
      />
      {payload ? (
        <foreignObject
          x={resolvedLabelOnLeft ? cx - activeLabelWidth - 8 : cx + 8}
          y={labelY}
          width={activeLabelWidth}
          height={labelHeight}
          className="overflow-visible"
        >
          <div
            className={cn(
              "flex h-full w-full items-start",
              resolvedLabelOnLeft ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "inline-flex items-center rounded-md border bg-card font-medium transition-colors",
                useCompactLabel
                  ? "max-w-[106px] gap-1 px-1 py-1 text-[9px]"
                  : "max-w-[146px] gap-1.5 px-1.5 py-1 text-[10px]",
                isMuted
                  ? "border-border/40 text-muted-foreground/50"
                  : "border-border text-foreground shadow-sm",
              )}
            >
              <span className={cn("shrink-0", isMuted && "opacity-35")}>
                {payload.labelKind === "provider" ? (
                  <ProviderMark
                    provider={payload.provider}
                    domain="llm"
                    size={useCompactLabel ? 13 : 15}
                  />
                ) : (
                  <ModelMark
                    model={payload.model}
                    author={payload.author}
                    size={useCompactLabel ? 13 : 15}
                  />
                )}
              </span>
              <span className="truncate">{payload.plotLabel}</span>
            </div>
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}

export function LlmMarketChart({
  payload,
  className,
}: {
  payload: LlmChartPayload;
  className?: string;
}) {
  const showInlineLabels = useMediaQuery("(min-width: 768px)");
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartWidth = useElementWidth(chartContainerRef);
  const pointElementsRef = React.useRef(new Map<string, SVGElement>());
  const [hoveredEndpointId, setHoveredEndpointId] = React.useState<
    string | null
  >(null);
  const [railHoveredEndpointId, setRailHoveredEndpointId] = React.useState<
    string | null
  >(null);

  const scatterData = React.useMemo<LlmScatterDatum[]>(() => {
    const visible = payload.endpoints.filter(
      (endpoint) =>
        endpoint.throughput &&
        endpoint.completionPricePerMillion &&
        endpoint.completionPricePerMillion > 0,
    );
    const prices = visible.map(
      (endpoint) => endpoint.completionPricePerMillion ?? 0,
    );
    const throughputs = visible.map((endpoint) => endpoint.throughput ?? 0);
    const priceAxis = buildEscalatingPriceAxis(prices);
    const throughputAxis = buildThroughputAxis(throughputs);
    const minLogPrice = Math.log10(priceAxis.domain[0]);
    const priceLogRange = Math.log10(priceAxis.domain[1]) - minLogPrice || 1;
    const clusterTops: Array<{ x: number; y: number }> = [];

    const plotted = visible.map((endpoint) => {
      const rawX =
        (Math.log10(endpoint.completionPricePerMillion ?? 1) - minLogPrice) /
        priceLogRange;
      const rawY = (endpoint.throughput ?? 0) / throughputAxis.domainMax;
      const isClusterTop = !clusterTops.some(
        (position) =>
          Math.abs(position.x - rawX) < 0.14 &&
          Math.abs(position.y - rawY) < 0.075,
      );
      if (isClusterTop) clusterTops.push({ x: rawX, y: rawY });

      return {
        ...endpoint,
        plotPrice: endpoint.completionPricePerMillion ?? 0,
        plotThroughput: endpoint.throughput ?? 0,
        plotLabel: payload.isMultiModelView
          ? endpoint.model
          : endpoint.provider,
        labelKind: payload.isMultiModelView ? "model" : "provider",
        labelOnLeft: rawX > 0.72,
        labelVertical: rawY < 0.08 ? "above" : rawY > 0.92 ? "below" : "middle",
        isClusterTop,
      } satisfies LlmScatterDatum;
    });

    return [
      ...plotted.filter((endpoint) => !endpoint.isClusterTop),
      ...plotted.filter((endpoint) => endpoint.isClusterTop),
    ];
  }, [payload]);
  const chartRows = React.useMemo(
    () =>
      [...scatterData].sort(
        (left, right) =>
          (right.throughput ?? 0) - (left.throughput ?? 0),
      ),
    [scatterData],
  );
  const renderedScatterData = React.useMemo(() => {
    if (!hoveredEndpointId) return scatterData;
    const hovered = scatterData.find(
      (endpoint) => endpoint.id === hoveredEndpointId,
    );
    if (!hovered) return scatterData;
    return [
      ...scatterData.filter((endpoint) => endpoint.id !== hoveredEndpointId),
      hovered,
    ];
  }, [hoveredEndpointId, scatterData]);
  const priceAxis = React.useMemo(
    () =>
      buildEscalatingPriceAxis(
        scatterData.map((endpoint) => endpoint.plotPrice),
      ),
    [scatterData],
  );
  const throughputAxis = React.useMemo(
    () =>
      buildThroughputAxis(
        scatterData.map((endpoint) => endpoint.plotThroughput),
      ),
    [scatterData],
  );
  const railHoveredEndpoint = React.useMemo(
    () =>
      scatterData.find((endpoint) => endpoint.id === railHoveredEndpointId) ??
      null,
    [railHoveredEndpointId, scatterData],
  );
  const railTooltipPosition = useAnchoredTooltip(
    railHoveredEndpointId,
    pointElementsRef,
    chartContainerRef,
  );
  const registerPoint = React.useCallback(
    (id: string, element: SVGCircleElement | null) => {
      if (element) pointElementsRef.current.set(id, element);
      else pointElementsRef.current.delete(id);
    },
    [],
  );

  return (
    <div className={cn(researchSurfaceClassName, className)}>
      <div className={researchPlotPanelClassName}>
        <div className="mb-4 flex shrink-0 items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold">Output price versus throughput</h3>
          <span className="text-xs text-muted-foreground">
            USD / 1M output tokens · p50 TPS · log price axis
          </span>
        </div>
        <div className="min-h-0 w-full min-w-0 flex-1">
          <div
            ref={chartContainerRef}
            className="relative h-full w-full min-w-0"
            aria-label="LLM output price versus throughput scatter plot"
          >
            {scatterData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={llmChartMargin}>
                  <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="plotPrice"
                    name="Output price"
                    scale="log"
                    domain={priceAxis.domain}
                    ticks={priceAxis.ticks}
                    tickFormatter={(value) => formatCurrencyTick(Number(value))}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={36}
                    tickMargin={8}
                  />
                  <YAxis
                    type="number"
                    dataKey="plotThroughput"
                    name="Throughput"
                    width={chartYAxisWidth}
                    axisLine={false}
                    tickLine={false}
                    tickSize={0}
                    tickMargin={8}
                    domain={throughputAxis.domain}
                    ticks={throughputAxis.ticks}
                    tickFormatter={(value) => Number(value).toLocaleString()}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <ZAxis range={[42, 42]} />
                  <Tooltip
                    active={Boolean(
                      hoveredEndpointId && !railHoveredEndpointId,
                    )}
                    cursor={false}
                    shared={false}
                    content={
                      <ChartTooltip
                        className="w-[180px] max-w-[calc(100vw_-_2rem)]"
                        formatter={(row) => (
                          <LlmTooltipDetails
                            endpoint={row as unknown as LlmChartEndpoint}
                          />
                        )}
                      />
                    }
                  />
                  <Scatter
                    data={renderedScatterData}
                    isAnimationActive={false}
                    shape={
                      <LlmScatterPoint
                        hoveredId={hoveredEndpointId}
                        onHover={setHoveredEndpointId}
                        showLabel={showInlineLabels}
                        containerWidth={chartWidth}
                        registerPoint={registerPoint}
                      />
                    }
                  >
                    {renderedScatterData.map((endpoint) => (
                      <Cell
                        key={endpoint.id}
                        fill={getProviderColor(endpoint.provider)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No measured text endpoints match this view.
              </div>
            )}
            {railHoveredEndpoint && railTooltipPosition ? (
              <div
                className="pointer-events-none absolute z-20 w-[180px] max-w-[calc(100%_-_1rem)] rounded border border-border bg-popover px-3 py-2.5 text-xs shadow-lg"
                style={railTooltipPosition}
              >
                <LlmTooltipDetails endpoint={railHoveredEndpoint} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <aside className={researchRailClassName}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Fastest measured</h3>
          <Link
            href={payload.resultsHref}
            prefetch={false}
            className="text-xs font-medium text-foreground hover:text-signal"
          >
            Explore
          </Link>
        </div>
        <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {!chartRows.length ? (
            <li className="py-4 text-sm text-muted-foreground">
              No measured endpoints in this view.
            </li>
          ) : null}
          {chartRows.map((endpoint, index) => (
            <li
              key={endpoint.id}
              tabIndex={0}
              onMouseEnter={() => {
                setHoveredEndpointId(endpoint.id);
                setRailHoveredEndpointId(endpoint.id);
              }}
              onMouseLeave={() => {
                setHoveredEndpointId(null);
                setRailHoveredEndpointId(null);
              }}
              onFocus={() => {
                setHoveredEndpointId(endpoint.id);
                setRailHoveredEndpointId(endpoint.id);
              }}
              onBlur={() => {
                setHoveredEndpointId(null);
                setRailHoveredEndpointId(null);
              }}
              className={cn(
                researchRailRowClassName,
                "outline-none transition-colors hover:bg-background/65 focus-visible:bg-background/65",
                hoveredEndpointId === endpoint.id && "bg-background/65",
              )}
            >
              <span className="numeric text-xs text-muted-foreground">
                {index + 1}
              </span>
              {payload.isMultiModelView ? (
                <ModelMark
                  model={endpoint.model}
                  author={endpoint.author}
                  size={24}
                />
              ) : (
                <ProviderMark provider={endpoint.provider} domain="llm" size={24} />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {payload.isMultiModelView
                    ? endpoint.model
                    : endpoint.provider}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {payload.isMultiModelView
                    ? endpoint.provider
                    : endpoint.model}
                </div>
              </div>
              <span className="numeric text-sm font-semibold">
                {endpoint.throughput?.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
