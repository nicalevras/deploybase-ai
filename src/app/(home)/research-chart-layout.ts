export const researchSurfaceClassName =
  "research-surface mt-8 grid w-full min-w-0 lg:h-[520px] lg:grid-cols-[minmax(0,1fr)_20rem]";
export const researchPlotPanelClassName =
  "flex h-[360px] min-w-0 flex-col px-5 py-7 sm:h-[420px] lg:h-auto lg:border-r lg:border-border lg:px-8";
export const researchRailClassName =
  "flex h-[360px] min-h-0 min-w-0 flex-col border-t border-border bg-site-chrome px-5 py-7 sm:h-[420px] lg:h-auto lg:border-t-0 lg:px-7";
export const researchRailRowClassName =
  "grid grid-cols-[1.5rem_1.5rem_minmax(0,1fr)_auto] items-center gap-2 px-1 py-3";

export const chartYAxisWidth = 40;
export const chartRightMargin = 12;
export const gpuChartMargin = {
  top: 30,
  right: chartRightMargin,
  bottom: 0,
  left: 0,
} as const;
export const llmChartMargin = {
  top: 8,
  right: chartRightMargin,
  bottom: 0,
  left: 0,
} as const;

export function formatChartPercent(value: number) {
  return `${value.toFixed(4)}%`;
}

export function formatChartCurrencyTick(value: number) {
  if (value >= 10 || Number.isInteger(value)) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(1)}`;
  return `$${value.toFixed(2)}`;
}
