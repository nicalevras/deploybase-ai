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
      <DialogContent className="max-w-5xl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle>Tool Comparison</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {rows.map((row, index) => {
            const data = row.original as ToolColumnSchema;
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
      </DialogContent>
    </Dialog>
  );
}
