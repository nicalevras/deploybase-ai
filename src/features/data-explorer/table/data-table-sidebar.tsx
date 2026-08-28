"use client";

import { DataTableFilterControls } from "@/features/data-explorer/data-table/data-table-filter-controls";
import { DataTableResetButton } from "@/features/data-explorer/data-table/data-table-reset-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/custom/sheet";
import { PanelLeftClose, SlidersHorizontal } from "lucide-react";

export function DataTableSidebar({ onCollapse }: { onCollapse: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-full min-h-0 w-72 shrink-0 flex-col border-r border-border bg-background sm:flex">
      <div className="box-border flex h-10 items-center justify-between border-b border-border px-4">
        <span className="text-xs font-semibold text-foreground">
          Filters
        </span>
        <div className="flex items-center gap-1">
          <DataTableResetButton />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCollapse}
            title="Hide filters"
            aria-label="Hide filters"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <DataTableFilterControls showSearch={false} />
      </div>
    </aside>
  );
}

export function DataTableMobileFilters() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-4 left-4 z-40 bg-card shadow-sm sm:hidden"
          title="Filters"
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        hideClose
        className="flex w-[min(18rem,90vw)] flex-col gap-0 p-0"
      >
        <SheetHeader className="box-border flex h-10 flex-row items-center justify-between space-y-0 border-b border-border px-4 text-left">
          <SheetTitle className="text-xs font-semibold text-foreground">
            Filters
          </SheetTitle>
          <div className="flex items-center gap-1">
            <DataTableResetButton />
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Hide filters"
                aria-label="Hide filters"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            Refine the current results.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <DataTableFilterControls showSearch={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
