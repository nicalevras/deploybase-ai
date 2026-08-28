"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import * as React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/custom/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import { useAnalytics } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSheetDetailsProps {
  title?: React.ReactNode;
  titleClassName?: string;
  children?: React.ReactNode;
  getRowHref?: (row: Record<string, unknown>) => string | null;
  ctaLabel?: string;
}

export function DataTableSheetDetails({
  title,
  titleClassName,
  children,
  getRowHref,
  ctaLabel = "Deploy",
}: DataTableSheetDetailsProps) {
  "use no memo";
  // Opt out of React Compiler — `table` from context is a stable reference
  // (TanStack mutates internally), so the compiler incorrectly caches method results.
  const { table, rowSelection, isLoading } = useDataTable();
  const plausible = useAnalytics();

  // [Analytics] Infer which table we're on from the URL path
  const analyticsTable = React.useMemo(() => {
    if (typeof window === "undefined") return "gpu" as const;
    const path = window.location.pathname;
    return path.startsWith("/llms") ? ("llm" as const) : path.startsWith("/tools") ? ("tool" as const) : ("gpu" as const);
  }, []);

  const selectedRowKey = Object.keys(rowSelection)?.[0];

  const selectedRow = React.useMemo(() => {
    if (isLoading && !selectedRowKey) return;
    return table
      .getCoreRowModel()
      .flatRows.find((row) => row.id === selectedRowKey);
  }, [selectedRowKey, isLoading, table]);

  const index = table
    .getCoreRowModel()
    .flatRows.findIndex((row) => row.id === selectedRow?.id);

  const nextId = React.useMemo(
    () => table.getCoreRowModel().flatRows[index + 1]?.id,
    [index, table],
  );

  const prevId = React.useMemo(
    () => table.getCoreRowModel().flatRows[index - 1]?.id,
    [index, table],
  );

  const selectedRowData = selectedRow?.original as Record<string, unknown> | undefined;
  const href = React.useMemo(() => {
    if (!selectedRowData || !getRowHref) return null;
    return getRowHref(selectedRowData);
  }, [selectedRowData, getRowHref]);

  const onPrev = React.useCallback(() => {
    if (prevId) table.setRowSelection({ [prevId]: true });
  }, [prevId, table]);

  const onNext = React.useCallback(() => {
    if (nextId) table.setRowSelection({ [nextId]: true });
  }, [nextId, table]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!selectedRowKey) return;

      // REMINDER: prevent dropdown navigation inside of sheet to change row selection
      const activeElement = document.activeElement;
      const isMenuActive = activeElement?.closest('[role="menu"]');

      if (isMenuActive) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Close the sheet and return focus to the selected row
        const el = selectedRowKey ? document.getElementById(selectedRowKey) : null;
        table.resetRowSelection();
        setTimeout(() => el?.focus(), 0);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selectedRowKey, onNext, onPrev, table]);

  // [Analytics] Track row detail view
  const hasTrackedRow = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!selectedRowData) return;
    const name = String(selectedRowData.name || selectedRowData.gpu_model || selectedRowData.provider || "");
    const key = `${analyticsTable}:${name}`;
    if (hasTrackedRow.current === key) return;
    hasTrackedRow.current = key;
    plausible("Row Detail", { props: { table: analyticsTable, name } });
  }, [selectedRowData, plausible, analyticsTable]);

  return (
    <Sheet
      open={!!selectedRowKey}
      onOpenChange={() => {
        // REMINDER: focus back to the row that was selected
        // We need to manually focus back due to missing Trigger component
        const el = selectedRowKey
          ? document.getElementById(selectedRowKey)
          : null;
        table.resetRowSelection();

        // REMINDER: when navigating between tabs in the sheet and exit the sheet, the tab gets lost
        // We need a minimal delay to allow the sheet to close before focusing back to the row
        setTimeout(() => el?.focus(), 0);
      }}
    >
      <SheetContent
        // onCloseAutoFocus={(e) => e.preventDefault()}
        className="flex h-full w-[min(34rem,92vw)] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-lg"
        hideClose
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-border px-5 py-3">
          <SheetHeader className="min-w-0 flex-1 text-left">
            <SheetTitle className={cn("truncate text-lg font-semibold leading-tight", titleClassName)}>
              {isLoading && !selectedRowKey ? <Skeleton className="h-6 w-32" /> : title}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!prevId} onClick={onPrev} aria-label="Previous row" title="Previous row"><ChevronUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!nextId} onClick={onNext} aria-label="Next row" title="Next row"><ChevronDown className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <SheetClose autoFocus asChild><Button size="icon" variant="ghost" className="h-8 w-8"><X className="h-4 w-4" /><span className="sr-only">Close</span></Button></SheetClose>
          </div>
        </div>
        <SheetDescription className="sr-only">
          Selected row details
        </SheetDescription>
        <div className="flex-1 overflow-y-auto py-5">
          <div className="space-y-4">{children}</div>
        </div>
        <SheetFooter className="border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row">
          {href ? (
            <Button asChild className="w-full font-semibold">
              {/* [Analytics] Track affiliate/outbound click */}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
                onClick={() => {
                  if (selectedRowData) {
                    plausible("Affiliate Click", {
                      props: {
                        provider: String(selectedRowData.provider || selectedRowData.name || "unknown"),
                        table: analyticsTable,
                        },
                    });
                  }
                }}
              >
                {ctaLabel}
              </a>
            </Button>
          ) : (
            <Button
              className="w-full font-semibold"
              type="button"
              disabled
            >
              {ctaLabel}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
