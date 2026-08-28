"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/features/data-explorer/data-table/data-table-column-header";
import { DataTableHeaderCheckbox } from "@/features/data-explorer/data-table/data-table-header-checkbox";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { getGpuProviderLogo, getProviderDisplayName } from "./provider-logos";
import type { ColumnSchema } from "./schema";

function RowCheckboxCell({ rowId }: { rowId: string }) {
  const { checkedRows, toggleCheckedRow } = useDataTable<
    ColumnSchema,
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

export const columns: ColumnDef<ColumnSchema>[] = [
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
        row.getValue<ColumnSchema["provider"]>("provider") ?? "";
      const provider = typeof providerRaw === "string" ? providerRaw : "";
      const logo = getGpuProviderLogo(provider);
      const displayName = getProviderDisplayName(provider);
      const fallbackInitial = displayName.charAt(0).toUpperCase();

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
                  className="text-[10px] font-semibold uppercase text-foreground/70"
                  aria-hidden="true"
                >
                  {fallbackInitial}
                </span>
              ) : null}
            </span>
          )}
          <span className="truncate font-medium" title={displayName}>
            {displayName}
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
    accessorKey: "gpu_model",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => {
      const displayName = row.original.gpu_model;

      if (!displayName) return <span className="text-foreground/70">N/A</span>;

      return <span className="block truncate font-medium">{displayName}</span>;
    },
    size: 275,
    minSize: 275,
    meta: {
      cellClassName: "text-left overflow-hidden min-w-[275px] pr-0",
      headerClassName: "text-left overflow-hidden min-w-[275px]",
    },
  },
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
      cellClassName: "text-center p-0 min-w-[45px]",
      headerClassName: "min-w-[45px] px-0",
    },
  },
  {
    accessorKey: "price_hour_usd",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="Price" />
      </div>
    ),
    cell: ({ row }) => {
      const original = row.original;
      const price = original.price_hour_usd || original.price_usd;
      if (!price) return <span className="text-foreground/70">N/A</span>;

      return (
        <div className="text-right">
          <span className="font-mono">${price.toFixed(2)}</span>{" "}
          <span className="font-mono text-foreground/70">HR</span>
        </div>
      );
    },
    filterFn: "inNumberRange",
    size: 145,
    minSize: 145,
    meta: {
      headerClassName: "text-right min-w-[145px]",
      cellClassName: "text-right min-w-[145px]",
    },
  },
  {
    accessorKey: "gpu_count",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="GPUs" />
      </div>
    ),
    cell: ({ row }) => {
      const gpuCount = row.getValue<ColumnSchema["gpu_count"]>("gpu_count");
      if (!gpuCount) return <span className="text-foreground/70">N/A</span>;

      return (
        <div className="text-right">
          <span className="font-mono">{gpuCount}</span>{" "}
          <span className="font-mono text-foreground/70">
            {gpuCount === 1 ? "GPU" : "GPUs"}
          </span>
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
    accessorKey: "vram_gb",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="VRAM" />
      </div>
    ),
    cell: ({ row }) => {
      const vramGb = row.getValue<ColumnSchema["vram_gb"]>("vram_gb");
      return vramGb ? (
        <div className="text-right">
          <span className="font-mono">{vramGb}</span>{" "}
          <span className="font-mono text-foreground/70">GB</span>
        </div>
      ) : (
        <span className="text-foreground/70">N/A</span>
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
    accessorKey: "vcpus",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="vCPUs" />
      </div>
    ),
    cell: ({ row }) => {
      const vcpus = row.getValue<ColumnSchema["vcpus"]>("vcpus");
      if (!vcpus) return <span className="text-foreground/70">N/A</span>;

      return (
        <div className="text-right">
          <span className="font-mono">{vcpus}</span>{" "}
          <span className="font-mono text-foreground/70">vCPUs</span>
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
    accessorKey: "system_ram_gb",
    header: ({ column }) => (
      <div className="flex justify-end">
        <DataTableColumnHeader column={column} title="RAM" />
      </div>
    ),
    cell: ({ row }) => {
      const ramGb =
        row.getValue<ColumnSchema["system_ram_gb"]>("system_ram_gb");
      return ramGb ? (
        <div className="text-right">
          <span className="font-mono">{ramGb}</span>{" "}
          <span className="font-mono text-foreground/70">GB</span>
        </div>
      ) : (
        <span className="text-foreground/70">N/A</span>
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
    accessorKey: "type",
    header: ({ column }) => (
      <div className="flex justify-start">
        <DataTableColumnHeader column={column} title="Config" />
      </div>
    ),
    cell: ({ row }) => {
      const type = row.getValue<ColumnSchema["type"]>("type");
      return type ? (
        <div className="flex justify-start">
          <span className="block h-5 w-fit rounded border border-border bg-muted px-1.5 text-xs leading-[18px] text-muted-foreground">
            {type}
          </span>
        </div>
      ) : (
        <span className="block text-left text-foreground/70">N/A</span>
      );
    },
    size: 145,
    minSize: 145,
    meta: {
      cellClassName: "text-left min-w-[145px]",
      headerClassName: "text-left min-w-[145px]",
    },
  },
];
