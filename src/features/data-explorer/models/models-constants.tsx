"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  DataTableFilterField,
  SheetField,
} from "@/features/data-explorer/data-table/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
  getModelLogo,
  getModelProviderLogo,
  type LogoResult,
} from "./model-provider-logos";
import type { ModelsColumnSchema } from "./models-schema";

export const modelsColumnOrder = [
  "blank",
  "provider",
  "name",
  "inputPrice",
  "outputPrice",
  "contextLength",
  "maxCompletionTokens",
  "throughput",
  "modalities",
];

export const formatThroughputDisplay = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "N/A";
  if (!Number.isFinite(value)) return "N/A";
  const formatted = value.toFixed(1);
  return `${formatted} tps`;
};

const LogoBadge = ({
  logo,
  size,
  className,
  fallbackLabel,
}: {
  logo: LogoResult;
  size: number;
  className?: string;
  fallbackLabel?: string | null;
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const initial = (logo?.alt ?? fallbackLabel)?.charAt(0).toUpperCase() ?? "";

  // Lobe Avatar — self-contained badge with brand bg + icon
  if (logo?.type === "icon") {
    return (
      <logo.Avatar
        size={size}
        shape="circle"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      />
    );
  }

  // Image fallback — our own container with border/bg
  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {logo?.type === "image" ? (
        <>
          {!loaded ? (
            <Skeleton className="absolute inset-0 h-full w-full animate-pulse" />
          ) : null}
          <Image
            src={logo.src}
            alt=""
            aria-hidden="true"
            role="presentation"
            fill
            sizes={`${size}px`}
            className="object-contain"
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : initial ? (
        <span
          className="text-[10px] font-semibold uppercase text-foreground/70"
          aria-hidden="true"
        >
          {initial}
        </span>
      ) : null}
    </span>
  );
};

const ModelProviderBadge = ({ provider }: { provider?: string | null }) => {
  const providerName = provider ?? "";
  const logo = getModelProviderLogo(providerName);
  return (
    <Link
      href={`/llms/${encodeURIComponent(providerName)}`}
      prefetch={false}
      className="flex min-w-0 items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <LogoBadge
        logo={logo}
        size={20}
        className="h-5 w-5 shrink-0"
        fallbackLabel={providerName}
      />
      <span className="truncate" title={providerName || undefined}>
        {providerName || "Unknown"}
      </span>
    </Link>
  );
};

const formatPricePerMillion = (price: number | string | null | undefined) => {
  if (price === null || price === undefined) return "Free";
  const numeric = typeof price === "string" ? Number(price) : price;
  if (Number.isNaN(numeric) || numeric === 0) return "Free";
  const perMillion = numeric * 1_000_000;
  return `$${perMillion.toFixed(2)} /M`;
};

const formatContextLength = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "N/A";
  return value.toLocaleString();
};

const formatModalities = (modalities?: string[]) => {
  if (!Array.isArray(modalities) || modalities.length === 0) return "N/A";
  const validModalities = modalities.filter(
    (modality): modality is string =>
      typeof modality === "string" && modality.trim().length > 0,
  );
  if (validModalities.length === 0) return "N/A";
  return validModalities.join(", ");
};

const formatParameterList = (parameters?: string | string[] | null) => {
  if (!parameters) return "N/A";
  const normalized =
    typeof parameters === "string"
      ? parameters
      : Array.isArray(parameters)
        ? parameters.join(",")
        : "";
  const trimmed = normalized.trim();
  if (!trimmed) return "N/A";
  const withoutBraces =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;
  const parts = withoutBraces
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "N/A";
  return parts.join(", ");
};

// Models filter fields
export const filterFields: DataTableFilterField<ModelsColumnSchema>[] = [
  {
    label: "Search",
    value: "search",
    type: "input",
    defaultOpen: true,
    placeholder: "Search LLMs",
  },
  {
    label: "Authors",
    value: "author",
    type: "checkbox",
    defaultOpen: true,
  },
  {
    label: "Input",
    value: "inputPrice",
    type: "slider",
    min: 0,
    max: 0.00001,
    defaultOpen: true,
  },
  {
    label: "Output",
    value: "outputPrice",
    type: "slider",
    min: 0,
    max: 0.00001,
    defaultOpen: true,
  },
  {
    label: "Context",
    value: "contextLength",
    type: "slider",
    min: 0,
    max: 1000000,
    step: 1024,
    defaultOpen: true,
  },
  {
    label: "Providers",
    value: "provider",
    type: "checkbox",
    defaultOpen: true,
  },
  {
    label: "Modalities",
    value: "modalities",
    type: "checkbox",
    defaultOpen: true,
  },
];

// Sheet fields for detailed view
export const sheetFields: SheetField<ModelsColumnSchema>[] = [
  {
    id: "shortName",
    label: "Model Name",
    type: "readonly",
    hideLabel: true,
    fullRowValue: true,
    noPadding: true,
    component: ({ metadata, ...row }) => {
      const titleClassName =
        typeof metadata === "object" &&
        metadata &&
        typeof (metadata as { titleClassName?: unknown }).titleClassName ===
          "string"
          ? (metadata as { titleClassName: string }).titleClassName
          : undefined;
      const fallback = row.name ?? "N/A";
      const value = row.shortName ?? fallback;
      const authorLogo = getModelLogo(row.name ?? row.shortName, row.author);
      return (
        <div className="flex items-start gap-3">
          {authorLogo ? (
            <LogoBadge
              logo={authorLogo}
              size={40}
              className="shrink-0"
              fallbackLabel={row.author}
            />
          ) : (
            <div className="h-10 w-10 shrink-0" />
          )}
          <div className="flex flex-col gap-0 leading-tight">
            <h2
              className={cn(
                "text-lg font-semibold leading-tight tracking-tight",
                titleClassName,
              )}
            >
              {value || fallback}
            </h2>
            <p className="pb-4 text-sm leading-tight text-foreground/70">
              {row.author ?? "N/A"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "provider",
    label: "Provider",
    type: "readonly",
    component: (row) => <ModelProviderBadge provider={row.provider} />,
  },
  {
    id: "inputPrice" as keyof ModelsColumnSchema,
    label: "Input Price",
    type: "readonly",
    numeric: true,
    component: (row) => formatPricePerMillion(row.promptPrice),
  },
  {
    id: "outputPrice" as keyof ModelsColumnSchema,
    label: "Output Price",
    type: "readonly",
    numeric: true,
    component: (row) => formatPricePerMillion(row.completionPrice),
  },
  {
    id: "contextLength",
    label: "Context Length",
    type: "readonly",
    component: (row) => formatContextLength(row.contextLength),
  },
  {
    id: "maxCompletionTokens",
    label: "Max Output",
    type: "readonly",
    component: (row) => formatContextLength(row.maxCompletionTokens),
  },
  {
    id: "inputModalities",
    label: "Input Modalities",
    type: "readonly",
    component: (row) => formatModalities(row.inputModalities),
  },
  {
    id: "outputModalities",
    label: "Output Modalities",
    type: "readonly",
    component: (row) => formatModalities(row.outputModalities),
  },
  {
    id: "supportedParameters",
    label: "Parameters",
    type: "readonly",
    component: (row) =>
      formatParameterList(row.supportedParameters ?? undefined),
  },
];
