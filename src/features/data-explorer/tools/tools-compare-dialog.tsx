"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemoizedDataTableSheetContent } from "@/features/data-explorer/data-table/data-table-sheet/data-table-sheet-content";
import type { Row, Table as TanStackTable } from "@tanstack/react-table";
import type { ToolColumnSchema } from "./tools-schema";
import { filterFields, sheetFields } from "./tools-constants";

interface ToolsCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: Row<ToolColumnSchema>[];
  table: TanStackTable<ToolColumnSchema>;
}

export function ToolsCompareDialog({
  open,
  onOpenChange,
  rows,
  table,
}: ToolsCompareDialogProps) {
  if (!rows.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden border-border bg-background p-0 [&>button:last-of-type]:right-5 [&>button:last-of-type]:top-5">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>Tool Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2">
          {rows.map((row, index) => {
            const data = row.original as ToolColumnSchema;
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
