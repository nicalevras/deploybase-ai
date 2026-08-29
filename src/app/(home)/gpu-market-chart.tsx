"use client";

import { ProviderMark } from "@/components/site/provider-mark";
import { getProviderDisplayName } from "@/features/data-explorer/table/provider-logos";
import { getProviderColor } from "@/lib/provider-branding";
import { buildLinearAxis } from "@/lib/research/chart-math";
import type { GpuChartOffer, GpuChartPayload } from "@/lib/research/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartTooltip,
  GpuTooltipDetails,
  ProviderAxisTick,
  chartGrid,
  useAnchoredTooltip,
  useElementWidth,
  useMediaQuery,
} from "./research-chart-shared";
import {
  chartRightMargin,
  chartYAxisWidth,
  gpuChartMargin,
  researchPlotPanelClassName,
  researchRailClassName,
  researchRailRowClassName,
  researchSurfaceClassName,
} from "./research-chart-layout";

function GpuBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill = "hsl(var(--signal))",
  background,
  highlightWidth,
  payload,
  hoveredKey,
  onHover,
  registerBar,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  background?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  highlightWidth?: number;
  payload?: GpuChartOffer;
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
  registerBar?: (key: string, element: SVGPathElement | null) => void;
}) {
  const key = payload?.stableKey;
  const isHovered = key === hoveredKey;
  const backgroundWidth = highlightWidth ?? background?.width ?? width;
  const backgroundX = x + width / 2 - backgroundWidth / 2;
  const radius = Math.min(3, width / 2, height);
  const path = [
    `M ${x} ${y + height}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `V ${y + height}`,
    "Z",
  ].join(" ");

  return (
    <g>
      {isHovered && background ? (
        <rect
          x={backgroundX}
          y={background.y}
          width={backgroundWidth}
          height={background.height}
          fill="hsl(var(--muted))"
          pointerEvents="none"
        />
      ) : null}
      <path
        ref={(element) => {
          if (key) registerBar?.(key, element);
        }}
        d={path}
        fill={fill}
        onMouseEnter={() => onHover?.(key ?? null)}
        onMouseLeave={() => onHover?.(null)}
      />
    </g>
  );
}

export function GpuMarketChart({
  payload,
  className,
}: {
  payload: GpuChartPayload;
  className?: string;
}) {
  const chartOffers = payload.offers;
  const showInlineLabels = useMediaQuery("(min-width: 768px)");
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const barElementsRef = React.useRef(new Map<string, SVGElement>());
  const [hoveredOfferKey, setHoveredOfferKey] = React.useState<string | null>(
    null,
  );
  const [railHoveredOfferKey, setRailHoveredOfferKey] = React.useState<
    string | null
  >(null);
  const chartWidth = useElementWidth(chartContainerRef);
  const categoryHighlightWidth = chartOffers.length
    ? Math.max(0, chartWidth - chartYAxisWidth - chartRightMargin) /
      chartOffers.length
    : 0;
  const priceAxis = React.useMemo(
    () => buildLinearAxis(chartOffers.map((offer) => offer.pricePerGpu)),
    [chartOffers],
  );
  const railHoveredOffer = React.useMemo(
    () =>
      chartOffers.find((offer) => offer.stableKey === railHoveredOfferKey) ??
      null,
    [chartOffers, railHoveredOfferKey],
  );
  const railTooltipPosition = useAnchoredTooltip(
    railHoveredOfferKey,
    barElementsRef,
    chartContainerRef,
  );
  const registerBar = React.useCallback(
    (key: string, element: SVGPathElement | null) => {
      if (element) barElementsRef.current.set(key, element);
      else barElementsRef.current.delete(key);
    },
    [],
  );

  return (
    <div className={cn(researchSurfaceClassName, className)}>
      <div className={researchPlotPanelClassName}>
        <div className="mb-3 flex shrink-0 items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold">Comparable provider price</h3>
          <span className="text-xs text-muted-foreground">
            USD per GPU-hour
          </span>
        </div>
        <div className="min-h-0 w-full flex-1 overflow-x-auto overscroll-x-contain">
          <div
            ref={chartContainerRef}
            className="relative h-full min-w-full"
            style={{
              width: showInlineLabels
                ? "100%"
                : `${Math.max(420, chartOffers.length * 36)}px`,
            }}
            aria-label={`Provider prices for ${payload.model}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartOffers}
                margin={gpuChartMargin}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="provider"
                  height={showInlineLabels ? 90 : 34}
                  interval={0}
                  tick={
                    <ProviderAxisTick
                      domain="gpu"
                      compact={!showInlineLabels}
                    />
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  tick={{ fontSize: 10 }}
                  width={chartYAxisWidth}
                  axisLine={false}
                  tickLine={false}
                  domain={priceAxis.domain}
                  ticks={priceAxis.ticks}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={
                    <ChartTooltip
                      className="w-[180px] max-w-[calc(100vw_-_2rem)]"
                      formatter={(row) => (
                        <GpuTooltipDetails
                          offer={row as unknown as GpuChartOffer}
                        />
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="pricePerGpu"
                  maxBarSize={showInlineLabels ? 48 : 18}
                  isAnimationActive={false}
                  shape={
                    <GpuBarShape
                      hoveredKey={hoveredOfferKey}
                      highlightWidth={categoryHighlightWidth}
                      onHover={setHoveredOfferKey}
                      registerBar={registerBar}
                    />
                  }
                >
                  {showInlineLabels ? (
                    <LabelList
                      dataKey="pricePerGpu"
                      position="top"
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      className="numeric fill-foreground text-[10px]"
                    />
                  ) : null}
                  {chartOffers.map((offer) => (
                    <Cell
                      key={offer.stableKey}
                      fill={getProviderColor(offer.provider)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {railHoveredOffer && railTooltipPosition ? (
              <div
                className="pointer-events-none absolute z-20 w-[180px] max-w-[calc(100%_-_1rem)] rounded border border-border bg-popover px-3 py-2.5 text-xs shadow-lg"
                style={railTooltipPosition}
              >
                <GpuTooltipDetails offer={railHoveredOffer} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <aside className={researchRailClassName}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Provider pricing</h3>
          <Link
            href="/gpus"
            prefetch={false}
            className="text-xs font-medium text-foreground hover:text-signal"
          >
            Explore
          </Link>
        </div>
        <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {chartOffers.map((offer, index) => (
            <li
              key={offer.stableKey}
              tabIndex={0}
              onMouseEnter={() => {
                setHoveredOfferKey(offer.stableKey);
                setRailHoveredOfferKey(offer.stableKey);
              }}
              onMouseLeave={() => {
                setHoveredOfferKey(null);
                setRailHoveredOfferKey(null);
              }}
              onFocus={() => {
                setHoveredOfferKey(offer.stableKey);
                setRailHoveredOfferKey(offer.stableKey);
              }}
              onBlur={() => {
                setHoveredOfferKey(null);
                setRailHoveredOfferKey(null);
              }}
              className={cn(
                researchRailRowClassName,
                "outline-none transition-colors hover:bg-background/65 focus-visible:bg-background/65",
                hoveredOfferKey === offer.stableKey && "bg-background/65",
              )}
            >
              <span className="numeric text-xs text-muted-foreground">
                {index + 1}
              </span>
              <ProviderMark provider={offer.provider} domain="gpu" size={24} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {getProviderDisplayName(offer.provider)}
                </div>
              </div>
              <span className="numeric text-sm font-semibold">
                ${offer.pricePerGpu.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
