"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="max-w-5xl gap-0 overflow-hidden border-border bg-background p-0 [&>button:last-of-type]:right-5 [&>button:last-of-type]:top-5">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>GPU Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2">
          {rows.map((row, index) => {
            const data = row.original as ColumnSchema;

            return (
              <div
                key={row.id ?? `compare-${index}`}
                className="space-y-4 px-6 py-5 md:border-r md:border-border md:last:border-r-0"
              >
                <MemoizedDataTableSheetContent
                  table={table}
                  data={data}
                  filterFields={filterFields}
                  fields={sheetFields}
                  metadata={{
                    titleClassName: "text-base font-semibold leading-none tracking-tight mb-1",
                  }}
                />
              </div>
            );
          })}
          {rows.length === 1 ? (
            <div className="hidden items-center justify-center border-l border-dashed border-border px-6 text-sm text-muted-foreground md:flex">
              Select another row to compare side by side.
            </div>
          ) : null}
          <div className="border-t border-border p-6 md:col-span-2">
            {/* Removed React.Suspense wrapper as next/dynamic handles it */}
            <LazyGpuCompareChart rows={rows} dialogOpen={open} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
