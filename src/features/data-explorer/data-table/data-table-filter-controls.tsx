"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/custom/accordion";
import * as React from "react";
import { DataTableFilterResetButton } from "./data-table-filter-reset-button";
import { DataTableFilterCheckbox } from "./data-table-filter-checkbox";
import { DataTableFilterSlider } from "./data-table-filter-slider";
import { DataTableFilterInput } from "./data-table-filter-input";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import { cn } from "@/lib/utils";
import { ModalitiesFilter } from "@/features/data-explorer/models/modalities-filter";

interface DataTableFilterControlsProps {
  showSearch?: boolean;
}

export function DataTableFilterControls({
  showSearch = true,
}: DataTableFilterControlsProps = {}) {
  const { filterFields } = useDataTable();

  const searchFilter = filterFields?.find((field) => field.value === "search");
  const otherFilters = filterFields?.filter((field) => field.value !== "search");

  const defaultAccordionValues = React.useMemo(
    () =>
      otherFilters
        ?.filter(({ defaultOpen }) => defaultOpen)
        .slice(0, 1)
        ?.map(({ value }) => value as string) ?? [],
    [otherFilters],
  );

  return (
    <>
      {showSearch && searchFilter && searchFilter.type === "input" ? (
        <div className="mb-6">
          <DataTableFilterInput {...searchFilter} />
        </div>
      ) : null}

      <Accordion type="multiple" defaultValue={defaultAccordionValues}>
        {otherFilters?.map((field) => {
          const value = field.value as string;
          return (
            <AccordionItem
              key={value}
              value={value}
              className="mb-0 border-b border-border"
            >
              <AccordionTrigger className="h-10 w-full rounded-none px-4 py-0 hover:no-underline data-[state=closed]:text-muted-foreground data-[state=open]:text-foreground focus-within:data-[state=closed]:text-foreground hover:data-[state=closed]:text-foreground [&>svg]:text-muted-foreground">
                <div className="flex w-full items-center justify-between gap-2 truncate pr-2">
                  <div className="flex items-center gap-2 truncate">
                    <p className="text-xs font-semibold text-foreground">{field.label}</p>
                  </div>
                  <div className="flex h-5 w-10 shrink-0 justify-end">
                    <DataTableFilterResetButton {...field} />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className={cn(
                field.type === "slider"
                  ? "data-[state=closed]:overflow-hidden data-[state=open]:overflow-visible [&>div]:pb-3"
                  : "[&>div]:pb-0"
              )}>
                <div
                  className={cn(
                    "px-4",
                    field.type === "slider"
                      ? "pb-0 pl-6 pr-4 pt-3"
                      : "py-1",
                  )}
                >
                  {(() => {
                    if (value === "modalities") {
                      return <ModalitiesFilter />;
                    }

                    switch (field.type) {
                      case "checkbox": {
                        return <DataTableFilterCheckbox {...field} />;
                      }
                      case "slider": {
                        return <DataTableFilterSlider {...field} />;
                      }
                      case "input": {
                        return <DataTableFilterInput {...field} />;
                      }
                    }
                  })()}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
}
