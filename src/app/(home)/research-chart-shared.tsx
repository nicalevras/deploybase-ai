"use client";

import { ModelMark, ProviderMark } from "@/components/site/provider-mark";
import { getProviderDisplayName } from "@/features/data-explorer/table/provider-logos";
import type {
  GpuChartOffer,
  LlmChartEndpoint,
} from "@/lib/research/types";
import { cn } from "@/lib/utils";
import * as React from "react";
import { formatChartCurrencyTick } from "./research-chart-layout";

export const chartGrid = "hsl(var(--border) / 0.72)";

export const formatCurrencyTick = formatChartCurrencyTick;

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useElementWidth(
  ref: React.RefObject<HTMLElement | null>,
) {
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

export function useAnchoredTooltip(
  activeKey: string | null,
  elementsRef: React.RefObject<Map<string, SVGElement>>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = React.useState<React.CSSProperties | null>(
    null,
  );

  React.useLayoutEffect(() => {
    if (!activeKey) {
      setPosition(null);
      return;
    }

    const element = elementsRef.current?.get(activeKey);
    const container = containerRef.current;
    if (!element || !container) {
      setPosition(null);
      return;
    }

    const update = () => {
      const anchor = element.getBoundingClientRect();
      const bounds = container.getBoundingClientRect();
      const left = anchor.left - bounds.left + anchor.width / 2;
      const top = anchor.top - bounds.top + anchor.height / 2;
      const horizontal =
        left > bounds.width * 0.68 ? "calc(-100% - 12px)" : "12px";
      const vertical =
        top < bounds.height * 0.2
          ? "8px"
          : top > bounds.height * 0.8
            ? "calc(-100% - 8px)"
            : "-50%";

      setPosition({
        left,
        top,
        transform: `translate(${horizontal}, ${vertical})`,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(element);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
    };
  }, [activeKey, containerRef, elementsRef]);

  return position;
}

function formatShortDate(value: string | null) {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ProviderAxisTick({
  x = 0,
  y = 0,
  payload,
  domain,
  compact = false,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  domain: "gpu" | "llm";
  compact?: boolean;
}) {
  const provider = String(payload?.value ?? "");
  const label = domain === "gpu" ? getProviderDisplayName(provider) : provider;
  const display = label.length > 18 ? `${label.slice(0, 17)}…` : label;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <foreignObject x={-10} y={7} width={20} height={20}>
        <ProviderMark provider={provider} domain={domain} size={20} />
      </foreignObject>
      {!compact ? (
        <text
          x={0}
          y={42}
          dy={0}
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          textAnchor="end"
          transform="rotate(-48 0 42)"
        >
          <title>{label}</title>
          {display}
        </text>
      ) : null}
    </g>
  );
}

export function ChartTooltip({
  active,
  payload,
  formatter,
  className,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  formatter: (value: Record<string, unknown>) => React.ReactNode;
  className?: string;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  return (
    <div
      className={cn(
        "max-w-64 rounded border border-border bg-popover px-3 py-2.5 text-xs shadow-lg",
        className,
      )}
    >
      {formatter(payload[0].payload)}
    </div>
  );
}

export function LlmTooltipDetails({
  endpoint,
}: {
  endpoint: LlmChartEndpoint;
}) {
  return (
    <>
      <div className="flex items-center gap-2 font-semibold">
        <ModelMark model={endpoint.model} author={endpoint.author} size={18} />
        <span className="truncate">{endpoint.model}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
        <ProviderMark provider={endpoint.provider} domain="llm" size={18} />
        <span className="truncate">{endpoint.provider}</span>
      </div>
      <div className="numeric mt-1">
        ${endpoint.completionPricePerMillion?.toFixed(2)} /M ·{" "}
        {endpoint.throughput?.toFixed(1)} TPS
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        Price {formatShortDate(endpoint.priceObservedAt)} · speed{" "}
        {formatShortDate(endpoint.throughputObservedAt)}
      </div>
    </>
  );
}

export function GpuTooltipDetails({ offer }: { offer: GpuChartOffer }) {
  return (
    <>
      <div className="flex items-center gap-2 font-semibold">
        <ProviderMark provider={offer.provider} domain="gpu" size={18} />
        <span className="truncate">
          {getProviderDisplayName(offer.provider)}
        </span>
      </div>
      <div className="numeric mt-1">
        ${offer.pricePerGpu.toFixed(2)} / GPU-hour
      </div>
      <div className="mt-1 text-muted-foreground">
        ${offer.priceHourly.toFixed(2)} listed · {offer.gpuCount} GPU
        {offer.gpuCount === 1 ? "" : "s"}
      </div>
    </>
  );
}
