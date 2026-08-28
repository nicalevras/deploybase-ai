"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { MemoizedDataTableSheetContent } from "@/features/data-explorer/data-table/data-table-sheet/data-table-sheet-content";
import { filterFields, sheetFields } from "./models-constants";
import type { ModelsColumnSchema } from "./models-schema";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when dialog is opened
import dynamic from "next/dynamic";

const LazyModelComparisonCharts = dynamic(
  () => import("./model-comparison-charts").then((module) => ({
    default: module.ModelComparisonCharts,
  })),
  {
    ssr: false, // Client-only - only loads when compare dialog is opened
  },
);

interface ModelCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: Row<ModelsColumnSchema>[];
  table: TanstackTable<ModelsColumnSchema>;
}

export function ModelCompareDialog({
  open,
  onOpenChange,
  rows,
  table,
}: ModelCompareDialogProps) {
  if (!rows.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden border-border bg-background p-0 [&>button:last-of-type]:right-5 [&>button:last-of-type]:top-5">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>Model Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2">
          {rows.map((row, index) => {
            const data = row.original as ModelsColumnSchema;
            return (
              <div
                key={row.id ?? `model-compare-${index}`}
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
              Select another model to compare side by side.
            </div>
          ) : null}
          <div className="space-y-4 border-t border-border p-6 md:col-span-2">
            {/* Removed React.Suspense wrapper as next/dynamic handles it */}
            <LazyModelComparisonCharts rows={rows} dialogOpen={open} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
