"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-5xl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle>LLM Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {rows.map((row, index) => {
            const data = row.original as ModelsColumnSchema;
            return (
              <MemoizedDataTableSheetContent
                key={row.id ?? `model-compare-${index}`}
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
              Select another model to compare side by side.
            </div>
          ) : null}
        </div>
        <LazyModelComparisonCharts rows={rows} dialogOpen={open} />
      </DialogContent>
    </Dialog>
  );
}
