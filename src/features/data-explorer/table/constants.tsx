"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  DataTableFilterField,
  Option,
  SheetField,
} from "@/features/data-explorer/data-table/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
  getGpuProviderLogo,
  getProviderDisplayName,
  type GpuLogoResult,
} from "./provider-logos";
import type { ColumnSchema } from "./schema";

export const gpuColumnOrder = [
  "blank",
  "provider",
  "gpu_model",
  "price_hour_usd",
  "gpu_count",
  "vram_gb",
  "vcpus",
  "system_ram_gb",
  "type",
];

const LogoBadge = ({
  logo,
  size,
  className,
  fallbackLabel,
}: {
  logo: GpuLogoResult;
  size: number;
  className?: string;
  fallbackLabel?: string | null;
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const initial = (logo?.alt ?? fallbackLabel)?.charAt(0).toUpperCase() ?? "";

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

const ProviderBadge = ({ provider }: { provider?: string | null }) => {
  const logo = getGpuProviderLogo(provider ?? undefined);
  const displayName = getProviderDisplayName(provider);
  const slug = (provider ?? "").toLowerCase().trim();
  return (
    <Link
      href={`/gpus/${slug}`}
      prefetch={false}
      className="flex min-w-0 items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <LogoBadge
        logo={logo}
        size={20}
        className="h-5 w-5 shrink-0"
        fallbackLabel={displayName}
      />
      <span className="truncate" title={displayName}>
        {displayName}
      </span>
    </Link>
  );
};

const GPU_BRAND_LOGOS: Record<
  string,
  {
    src: string;
    alt: string;
  }
> = {
  nvidia: { src: "/logos/nvidia.png", alt: "NVIDIA" },
  amd: { src: "/logos/amd.png", alt: "AMD" },
  intel: { src: "/logos/intel.png", alt: "Intel" },
  asus: { src: "/logos/asus.png", alt: "ASUS" },
  gigabyte: { src: "/logos/gigabyte.png", alt: "Gigabyte" },
  lenovo: { src: "/logos/lenovo.png", alt: "Lenovo" },
};

const getGpuBrandLogo = (brand?: string) => {
  if (!brand) return null;
  return GPU_BRAND_LOGOS[brand.toLowerCase()] ?? null;
};

const TruncatedOption = ({ label }: Option) => {
  const base = String(label ?? "");
  const maxLength = 23;
  const display =
    base.length > maxLength ? `${base.slice(0, maxLength)}…` : base;
  return (
    <span className="block w-full truncate font-normal" title={base}>
      {display}
    </span>
  );
};

const CapitalizedOption = ({ label }: Option) => {
  const base = String(label ?? "");
  return (
    <span className="block w-full truncate font-normal capitalize" title={base}>
      {base}
    </span>
  );
};

const ProviderOption = ({ label }: Option) => {
  const base = String(label ?? "");
  const displayName = getProviderDisplayName(base);
  return (
    <span className="block w-full truncate font-normal" title={displayName}>
      {displayName}
    </span>
  );
};

const VRAM_SLIDER_MIN = 16;
const VRAM_SLIDER_MAX = 192;
const VRAM_SLIDER_STEP = 1;

// GPU pricing filter fields
export const filterFields: DataTableFilterField<ColumnSchema>[] = [
  {
    label: "Search",
    value: "search",
    type: "input",
    defaultOpen: true,
    placeholder: "Search GPUs",
  },
  {
    label: "Models",
    value: "gpu_model",
    type: "checkbox",
    defaultOpen: true,
    component: TruncatedOption,
  },
  {
    label: "Price",
    value: "price_hour_usd",
    type: "slider",
    min: 0.01,
    max: 20,
    step: 0.01,
    defaultOpen: true,
  },
  {
    label: "VRAM",
    value: "vram_gb",
    type: "slider",
    min: VRAM_SLIDER_MIN,
    max: VRAM_SLIDER_MAX,
    step: VRAM_SLIDER_STEP,
    defaultOpen: true,
  },
  {
    label: "Providers",
    value: "provider",
    type: "checkbox",
    defaultOpen: true,
    component: ProviderOption,
  },
  {
    label: "Config",
    value: "type",
    type: "checkbox",
    defaultOpen: true,
    component: CapitalizedOption,
    skeletonRows: 2,
  },
];

export const sheetFields = [
  {
    id: "gpu_model",
    label: "GPU Configuration",
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
      const headlineSource =
        row.gpu_model || row.item || row.sku || "Unknown configuration";
      const headlineParts = headlineSource.trim().split(/\s+/);
      const firstWord = headlineParts.shift() ?? "";
      const remaining = headlineParts.join(" ") || "Unknown configuration";
      const brandEntry = getGpuBrandLogo(firstWord);
      const brandLogo: GpuLogoResult = brandEntry
        ? { type: "image", src: brandEntry.src, alt: brandEntry.alt }
        : null;
      return (
        <div className="flex items-start gap-3">
          <LogoBadge
            logo={brandLogo}
            size={40}
            className="h-10 w-10 shrink-0"
            fallbackLabel={firstWord}
          />
          <div className="flex flex-col gap-0 leading-tight">
            <h2
              className={cn(
                "text-lg font-semibold leading-tight tracking-tight",
                titleClassName,
              )}
            >
              {remaining}
            </h2>
            <p className="pb-4 text-sm leading-tight text-foreground/70">
              {firstWord}
            </p>
          </div>
        </div>
      );
    },
    skeletonClassName: "w-40",
  },
  {
    id: "provider",
    label: "Provider",
    type: "readonly",
    component: (row) => <ProviderBadge provider={row.provider} />,
    skeletonClassName: "w-40",
  },
  {
    id: "price_hour_usd",
    label: "Price",
    type: "readonly",
    component: (row) =>
      row.price_hour_usd ? (
        `$${row.price_hour_usd.toFixed(2)} HR`
      ) : (
        <span className="text-muted-foreground">N/A</span>
      ),
    skeletonClassName: "w-24",
  },
  {
    id: "gpu_count",
    label: "GPU Count",
    type: "readonly",
    component: (row) => (row.gpu_count ? `${row.gpu_count}` : "N/A"),
    skeletonClassName: "w-16",
  },
  {
    id: "vram_gb",
    label: "VRAM",
    type: "readonly",
    component: (row) => (row.vram_gb ? `${row.vram_gb} GB` : "N/A"),
    skeletonClassName: "w-16",
  },
  {
    id: "vcpus",
    label: "vCPUs",
    type: "readonly",
    component: (row) =>
      row.vcpus === undefined || row.vcpus === null ? "N/A" : `${row.vcpus}`,
    skeletonClassName: "w-16",
  },
  {
    id: "system_ram_gb",
    label: "RAM",
    type: "readonly",
    component: (row) => (row.system_ram_gb ? `${row.system_ram_gb} GB` : "N/A"),
    skeletonClassName: "w-20",
  },
  {
    id: "type",
    label: "Config",
    type: "readonly",
    component: (row) => row.type ?? "N/A",
    skeletonClassName: "w-20",
  },
] satisfies SheetField<ColumnSchema>[];
