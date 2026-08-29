"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemoizedDataTableSheetContent } from "@/features/data-explorer/data-table/data-table-sheet/data-table-sheet-content";
import type { Table as TanStackTable, Row } from "@tanstack/react-table";
import type { ColumnSchema } from "@/features/data-explorer/table/schema";
import { filterFields, sheetFields } from "@/features/data-explorer/table/constants";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when dialog is opened
import dynamic from "next/dynamic";

const LazyGpuCompareChart = dynamic(
  () => import("./gpu-compare-chart").then((module) => ({
    default: module.GpuCompareChart,
  })),
  {
    ssr: false, // Client-only - only loads when compare dialog is opened
  },
);

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: Row<ColumnSchema>[];
  table: TanStackTable<ColumnSchema>;
}

export function CompareDialog({
  open,
  onOpenChange,
  rows,
  table,
}: CompareDialogProps) {
  if (!rows.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle>GPU Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {rows.map((row, index) => {
            const data = row.original as ColumnSchema;

            return (
              <MemoizedDataTableSheetContent
                key={row.id ?? `compare-${index}`}
                table={table}
                data={data}
                filterFields={filterFields}
                fields={sheetFields}
                metadata={{
                  titleClassName: "text-base font-semibold leading-none tracking-tight mb-1",
                }}
                className="[&>div>*]:px-0"
              />
            );
          })}
          {rows.length === 1 ? (
            <div className="hidden items-center justify-center border-l border-dashed border-border text-sm text-muted-foreground md:flex">
              Select another row to compare side by side.
            </div>
          ) : null}
        </div>
        {/* Removed React.Suspense wrapper as next/dynamic handles it */}
        <LazyGpuCompareChart rows={rows} dialogOpen={open} />
      </DialogContent>
    </Dialog>
  );
}
