"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { DataTableColumnHeader } from "@/features/data-explorer/data-table/data-table-column-header";
import { DataTableHeaderCheckbox } from "@/features/data-explorer/data-table/data-table-header-checkbox";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { getModelProviderLogo } from "./model-provider-logos";
import type { ModelsColumnSchema } from "./models-schema";

function RowCheckboxCell({ rowId }: { rowId: string }) {
  const { checkedRows, toggleCheckedRow } = useDataTable<
    ModelsColumnSchema,
    unknown
  >();
  const isChecked = checkedRows[rowId] ?? false;
  return (
    <Checkbox
      checked={isChecked}
      onCheckedChange={(next) => toggleCheckedRow(rowId, Boolean(next))}
      aria-label={`Check row ${rowId}`}
      className="shadow-sm transition-shadow"
    />
  );
}

function formatPricePerMillion(
  price: string | number | null | undefined,
): string {
  if (price === undefined || price === null) return "Free";

  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numericPrice) || numericPrice === 0) return "Free";

  // Convert from per-token to per-million-tokens
  const perMillion = numericPrice * 1_000_000;

  // Format with 2 decimal places
  return `$${perMillion.toFixed(2)}`;
}

function formatThroughput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(1);
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export const modelsColumns: ColumnDef<ModelsColumnSchema>[] = [
  {
    id: "blank",
    header: () => (
      <div className="flex items-center justify-center">
        <DataTableHeaderCheckbox />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    cell: ({ row }) => {
      const stop = (e: React.SyntheticEvent) => e.stopPropagation();
      return (
        <div
          className="flex h-full items-center justify-center"
          onClick={stop}
          onMouseDown={stop}
          onPointerDown={stop}
          onKeyDown={stop}
        >
          <RowCheckboxCell rowId={row.id} />
        </div>
      );
    },
    size: 45,
    minSize: 45,
    maxSize: 45,
    meta: {
      cellClassName: "min-w-[45px] p-0 text-center",
      headerClassName: "min-w-[45px] px-0",
    },
  },
  {
    accessorKey: "provider",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Provider"
        className="pl-0 pr-[12px]"
      />
    ),
    cell: ({ row }) => {
      const providerRaw =
        row.getValue<ModelsColumnSchema["provider"]>("provider") ?? "";
      const provider = typeof providerRaw === "string" ? providerRaw : "";
      const logo = getModelProviderLogo(provider);
      const fallbackInitial = provider ? provider.charAt(0).toUpperCase() : "";

      return (
        <div className="flex min-w-0 items-center gap-2">
          {logo?.type === "icon" ? (
            <logo.Avatar
              size={20}
              shape="circle"
              className="shrink-0"
              aria-hidden="true"
            />
          ) : (
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-background">
              {logo?.type === "image" ? (
                <Image
                  src={logo.src}
                  alt=""
                  aria-hidden="true"
                  role="presentation"
                  fill
                  sizes="20px"
                  className="object-contain"
                  loading="eager"
                />
              ) : fallbackInitial ? (
                <span
                  className="text-[10px] font-semibold uppercase text-muted-foreground"
                  aria-hidden="true"
                >
                  {fallbackInitial}
                </span>
              ) : null}
            </span>
          )}
          <span className="truncate font-medium" title={provider || undefined}>
            {provider || "Unknown"}
          </span>
        </div>
      );
    },
    size: 200,
    minSize: 200,
    meta: {
      cellClassName: "text-left min-w-[200px] pl-0",
      headerClassName: "text-left min-w-[200px] pl-0",
    },
  },
  {
    id: "name",
    accessorFn: (row) =>
      typeof row.shortName === "string" ? row.shortName : "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => {
      const { shortName, name } = row.original;
      const primaryLabel =
        typeof shortName === "string" && shortName.trim().length
          ? shortName
          : name;

      if (!primaryLabel) {
        return <span className="text-muted-foreground">Unknown</span>;
      }

      return <div className="truncate font-medium">{primaryLabel}</div>;
    },
    size: 275,
    minSize: 275,
    meta: {
      cellClassName: "text-left overflow-hidden min-w-[275px] pr-0",
      headerClassName: "text-left overflow-hidden min-w-[275px]",
    },
  },
  {
    accessorKey: "contextLength",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Context" />
      </div>
    ),
    cell: ({ row }) => {
      const contextLength = row.original.contextLength;

      if (!contextLength)
        return <span className="text-muted-foreground">N/A</span>;

      return (
        <div className="text-right font-mono text-sm">
          {formatTokenCount(contextLength)}{" "}
          <span className="font-mono text-foreground/70">TOK</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-right min-w-[145px]",
      headerClassName: "text-right min-w-[145px]",
    },
  },
  {
    accessorKey: "maxCompletionTokens",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Max Output" />
      </div>
    ),
    cell: ({ row }) => {
      const maxTokens = row.original.maxCompletionTokens;

      if (!maxTokens) {
        return <span className="text-foreground/70">N/A</span>;
      }

      return (
        <div className="text-right font-mono text-sm">
          {formatTokenCount(maxTokens)}{" "}
          <span className="font-mono text-foreground/70">TOK</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    enableSorting: true,
    sortingFn: "auto",
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-right min-w-[145px]",
      headerClassName: "text-right min-w-[145px]",
    },
  },
  {
    accessorKey: "throughput",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Throughput" />
      </div>
    ),
    cell: ({ row }) => {
      const throughput = row.original.throughput;
      const formatted = formatThroughput(throughput ?? null);
      const isNA = formatted === "N/A";
      return (
        <span
          className={cn(
            "block text-right font-mono text-sm tabular-nums",
            isNA ? "text-foreground/70" : undefined,
          )}
        >
          {formatted}
          {!isNA ? <span className="text-foreground/70"> TPS</span> : null}
        </span>
      );
    },
    enableSorting: true,
    sortingFn: "auto",
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-right min-w-[145px] tabular-nums",
      headerClassName: "text-right min-w-[145px] tabular-nums",
    },
  },
  {
    id: "modalities",
    accessorKey: "inputModalities",
    header: ({ column }) => (
      <div className="flex justify-start">
        <DataTableColumnHeader column={column} title="Modality" />
      </div>
    ),
    cell: ({ row }) => {
      const inputModalities = row.original.inputModalities ?? [];
      const outputModalities = row.original.outputModalities ?? [];
      const hasModalities =
        inputModalities.length + outputModalities.length > 0;

      const computedScore =
        row.original.modalityScore ??
        new Set([...inputModalities, ...outputModalities]).size;

      if (!hasModalities || computedScore === 0) {
        return <span className="text-foreground/70">N/A</span>;
      }

      const label = computedScore > 1 ? "Multimodal" : "Unimodal";
      const formatList = (modalities: string[]) =>
        modalities.length ? modalities.join(", ") : "-";

      return (
        <div className="flex justify-start">
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <div className="h-5 w-fit cursor-pointer rounded border border-border bg-muted px-1.5 text-left text-xs leading-[18px] text-muted-foreground">
                {label}
              </div>
            </HoverCardTrigger>
            <HoverCardPrimitive.Portal>
              <HoverCardContent
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="w-fit max-w-[155px] space-y-1.5 p-2 text-left text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">Input:</span>{" "}
                  <span className="text-foreground/80">
                    {formatList(inputModalities)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Output:</span>{" "}
                  <span className="text-foreground/80">
                    {formatList(outputModalities)}
                  </span>
                </div>
              </HoverCardContent>
            </HoverCardPrimitive.Portal>
          </HoverCard>
        </div>
      );
    },
    enableSorting: true,
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-left min-w-[145px]",
      headerClassName: "text-left min-w-[145px]",
    },
  },
  {
    id: "inputPrice",
    accessorKey: "promptPrice",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Input" />
      </div>
    ),
    cell: ({ row }) => {
      const inputPrice = row.original.promptPrice;

      const formattedPrice = formatPricePerMillion(inputPrice);

      return (
        <div className="text-right">
          {formattedPrice === "Free" ? (
            <span className="font-mono text-foreground">Free</span>
          ) : (
            <>
              <span className="font-mono">{formattedPrice}</span>{" "}
              <span className="font-mono text-foreground/70">/M</span>
            </>
          )}
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-right min-w-[145px]",
      headerClassName: "text-right min-w-[145px]",
    },
  },
  {
    id: "outputPrice",
    accessorKey: "completionPrice",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Output" />
      </div>
    ),
    cell: ({ row }) => {
      const outputPrice = row.original.completionPrice;

      const formattedPrice = formatPricePerMillion(outputPrice);

      return (
        <div className="text-right">
          {formattedPrice === "Free" ? (
            <span className="font-mono text-foreground">Free</span>
          ) : (
            <>
              <span className="font-mono">{formattedPrice}</span>{" "}
              <span className="font-mono text-foreground/70">/M</span>
            </>
          )}
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-right min-w-[145px]",
      headerClassName: "text-right min-w-[145px]",
    },
  },
];
