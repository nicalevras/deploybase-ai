import {
  buildEscalatingPriceAxis,
  buildLinearAxis,
  buildThroughputAxis,
} from "@/lib/research/chart-math";
import { cn } from "@/lib/utils";
import {
  chartRightMargin,
  chartYAxisWidth,
  formatChartCurrencyTick,
  formatChartPercent,
  gpuChartMargin,
  llmChartMargin,
  researchPlotPanelClassName,
  researchRailClassName,
  researchRailRowClassName,
  researchSurfaceClassName,
} from "./research-chart-layout";

const DEFAULT_GPU_PRICES = [
  0.35, 2.19, 2.5, 2.5, 3.37, 3.64, 3.85, 3.9, 4.41, 5.49, 5.95, 6.16,
  6.88, 10, 11.06,
];

const DEFAULT_LLM_POINTS = [
  { price: 50, throughput: 159 },
  { price: 1.2, throughput: 136 },
  { price: 1.35, throughput: 132 },
  { price: 3.1, throughput: 121 },
  { price: 3.2, throughput: 112 },
  { price: 12, throughput: 109 },
  { price: 5, throughput: 99 },
  { price: 1.45, throughput: 93 },
  { price: 10, throughput: 91 },
  { price: 1.5, throughput: 84 },
  { price: 4.5, throughput: 78 },
  { price: 6, throughput: 65 },
  { price: 20, throughput: 56 },
  { price: 0.2, throughput: 55 },
  { price: 8, throughput: 49 },
  { price: 15, throughput: 43 },
  { price: 2.5, throughput: 22 },
];

function ChartHeader({ kind }: { kind: "gpu" | "llm" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-baseline justify-between gap-4",
        kind === "gpu" ? "mb-3" : "mb-4",
      )}
    >
      <h3 className="text-sm font-semibold">
        {kind === "gpu"
          ? "Comparable provider price"
          : "Output price vs throughput"}
      </h3>
      <span className="text-right text-xs text-muted-foreground">
        {kind === "gpu"
          ? "USD per GPU-hour"
          : "USD / 1M output tokens"}
      </span>
    </div>
  );
}

function GpuPlotSkeleton() {
  const prices = DEFAULT_GPU_PRICES;
  const axis = buildLinearAxis(prices);
  const chartWidth = Math.max(420, prices.length * 36);

  return (
    <div className="min-h-0 w-full flex-1 overflow-x-auto overscroll-x-contain">
      <div
        className="relative h-full min-w-full"
        style={{ width: chartWidth }}
      >
        <div
          className="absolute bottom-[34px] md:bottom-[90px]"
          style={{
            left: chartYAxisWidth,
            right: chartRightMargin,
            top: gpuChartMargin.top,
          }}
        >
          {axis.ticks.map((tick) => {
            const position = (tick / axis.domainMax) * 100;
            return (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-border/70"
                style={{ bottom: formatChartPercent(position) }}
              >
                <span className="absolute right-full top-0 mr-2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  ${tick}
                </span>
              </div>
            );
          })}

          <div
            className="absolute inset-0 grid items-end"
            style={{ gridTemplateColumns: `repeat(${prices.length}, minmax(0, 1fr))` }}
          >
            {prices.map((price, index) => {
              const height = (price / axis.domainMax) * 100;
              return (
                <div
                  key={`${price}-${index}`}
                  className="relative flex h-full min-w-0 items-end justify-center"
                >
                  <span
                    className="absolute hidden h-2.5 w-8 -translate-x-1/2 animate-pulse rounded-sm bg-muted md:block"
                    style={{
                      bottom: `calc(${formatChartPercent(height)} + 5px)`,
                      left: "50%",
                    }}
                  />
                  <div
                    className="w-[76%] max-w-12 animate-pulse rounded-t-sm bg-muted"
                    style={{ height: formatChartPercent(height) }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="absolute bottom-0 grid h-[34px] md:h-[90px]"
          style={{
            left: chartYAxisWidth,
            right: chartRightMargin,
            gridTemplateColumns: `repeat(${prices.length}, minmax(0, 1fr))`,
          }}
        >
          {prices.map((_, index) => (
            <div key={index} className="relative flex justify-center pt-[15px]">
              <span className="h-5 w-5 animate-pulse rounded-full border border-border bg-site-chrome" />
              <span className="absolute right-1/2 top-[43px] hidden h-2 w-12 origin-top-right -rotate-[48deg] animate-pulse rounded-sm bg-muted md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LlmPlotSkeleton() {
  const endpoints = DEFAULT_LLM_POINTS;
  const priceAxis = buildEscalatingPriceAxis(
    endpoints.map((endpoint) => endpoint.price),
  );
  const throughputAxis = buildThroughputAxis(
    endpoints.map((endpoint) => endpoint.throughput),
  );
  const minLogPrice = Math.log10(priceAxis.domain[0]);
  const logRange = Math.log10(priceAxis.domain[1]) - minLogPrice || 1;

  return (
    <div className="min-h-0 w-full min-w-0 flex-1">
      <div className="relative h-full w-full min-w-0">
        <div
          className="absolute bottom-[30px]"
          style={{
            left: chartYAxisWidth,
            right: chartRightMargin,
            top: llmChartMargin.top,
          }}
        >
          {throughputAxis.ticks.map((tick) => {
            const position = (tick / throughputAxis.domainMax) * 100;
            return (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-dashed border-border/70"
                style={{ bottom: formatChartPercent(position) }}
              >
                <span className="absolute right-full top-0 mr-2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {tick}
                </span>
              </div>
            );
          })}

          {priceAxis.ticks.map((tick) => {
            const position =
              ((Math.log10(tick) - minLogPrice) / logRange) * 100;
            return (
              <div
                key={tick}
                className="absolute bottom-0 top-0 border-l border-dashed border-border/70"
                style={{ left: formatChartPercent(position) }}
              />
            );
          })}

          <div className="absolute inset-0 overflow-hidden">
            {endpoints.map((endpoint, index) => {
              const left =
                ((Math.log10(endpoint.price) - minLogPrice) / logRange) * 100;
              const bottom =
                (endpoint.throughput / throughputAxis.domainMax) * 100;
              const labelLeft = left > 72;
              return (
                <div
                  key={`${endpoint.price}-${endpoint.throughput}-${index}`}
                  className="absolute"
                  style={{
                    left: formatChartPercent(left),
                    bottom: formatChartPercent(bottom),
                  }}
                >
                  <span className="block h-[9px] w-[9px] animate-pulse rounded-full bg-muted" />
                  <span
                    className={cn(
                      "absolute top-1/2 h-7 w-[106px] -translate-y-1/2 animate-pulse rounded-md border border-border bg-site-chrome md:w-[146px]",
                      labelLeft ? "right-[17px]" : "left-[17px]",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="absolute bottom-0 h-[30px] text-[10px] text-muted-foreground"
          style={{ left: chartYAxisWidth, right: chartRightMargin }}
        >
          {priceAxis.ticks.map((tick) => {
            const position =
              ((Math.log10(tick) - minLogPrice) / logRange) * 100;
            return (
              <span
                key={tick}
                className="absolute top-[10px] -translate-x-1/2"
                style={{ left: formatChartPercent(position) }}
              >
                {formatChartCurrencyTick(tick)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RailSkeleton({
  kind,
  itemCount,
}: {
  kind: "gpu" | "llm";
  itemCount: number;
}) {
  const rows = Array.from({ length: Math.min(Math.max(itemCount, 1), 10) });
  return (
    <aside className={researchRailClassName}>
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {kind === "gpu" ? "Provider pricing" : "Fastest measured"}
        </h3>
        <span className="text-xs font-medium text-foreground">Explore</span>
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {rows.map((_, index) => (
          <li
            key={index}
            className={researchRailRowClassName}
          >
            <span className="numeric text-xs text-muted-foreground">
              {index + 1}
            </span>
            <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0">
              <div
                className={cn(
                  "h-4 animate-pulse rounded-sm bg-muted",
                  index % 2 ? "w-24" : "w-28",
                )}
              />
              {kind === "llm" ? (
                <div className="mt-1 h-4 w-20 animate-pulse rounded-sm bg-muted" />
              ) : null}
            </div>
            <div className="h-4 w-10 animate-pulse rounded-sm bg-muted" />
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function ResearchSurfaceSkeleton({
  kind,
  className,
}: {
  kind: "gpu" | "llm";
  className?: string;
}) {
  const itemCount =
    kind === "gpu" ? DEFAULT_GPU_PRICES.length : DEFAULT_LLM_POINTS.length;

  return (
    <div
      className={cn(
        researchSurfaceClassName,
        className,
      )}
      aria-hidden="true"
    >
      <div className={researchPlotPanelClassName}>
        <ChartHeader kind={kind} />
        {kind === "gpu" ? <GpuPlotSkeleton /> : <LlmPlotSkeleton />}
      </div>
      <RailSkeleton kind={kind} itemCount={itemCount} />
    </div>
  );
}
