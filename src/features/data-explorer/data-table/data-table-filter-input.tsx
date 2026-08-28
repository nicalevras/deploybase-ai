"use client";

import type { DataTableInputFilterField } from "./types";
import { InputWithAddons } from "@/components/custom/input-with-addons";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import { useAnalytics } from "@/lib/analytics";

function getFilter(filterValue: unknown) {
  return typeof filterValue === "string" ? filterValue : null;
}

export function DataTableFilterInput<TData>({
  value: _value,
  autoFocus,
  placeholder = "Search",
}: DataTableInputFilterField<TData> & { autoFocus?: boolean }) {
  const value = _value as string;
  const { columnFilters, setColumnFilters } = useDataTable();
  const plausible = useAnalytics();
  const filterValue = columnFilters.find((i) => i.id === value)?.value;
  const filters = getFilter(filterValue);
  const [input, setInput] = useState<string | null>(filters);

  // Track if the current input change came from user interaction
  const isUserInputRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounce(input, 500);

  // Apply filter when debounced input changes (only from user input)
  useEffect(() => {
    if (!isUserInputRef.current) return;

    const newValue = debouncedInput?.trim() === "" ? null : debouncedInput;

    setColumnFilters((current) => {
      if (newValue === null || newValue === undefined) {
        return current.filter((filter) => filter.id !== value);
      }

      const existingIndex = current.findIndex((filter) => filter.id === value);
      if (existingIndex === -1) {
        return [...current, { id: value, value: newValue }];
      }

      return current.map((filter, index) =>
        index === existingIndex ? { ...filter, value: newValue } : filter,
      );
    });

    // [Analytics] Track search query after debounce
    if (newValue) {
      const path = window.location.pathname;
      const table = path.startsWith("/llms") ? "llm" : path.startsWith("/tools") ? "tool" : "gpu";
      plausible("Search", { props: { query: newValue, table } });
    }

    isUserInputRef.current = false;
  }, [debouncedInput, setColumnFilters, value, plausible]);

  // Sync external changes to local state using React-recommended
  // "adjusting state based on props during render" pattern.
  // When filters change externally (e.g. programmatic clear), update local input.
  // This won't interfere with typing because debounce hasn't fired yet.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setInput(filters);
  }

  const isFilterActive = Boolean(filters && filters.trim() !== "");

  const handleClear = () => {
    isUserInputRef.current = false;
    if (isFilterActive) {
      setColumnFilters((current) => current.filter((filter) => filter.id !== value));
    }
    setInput(null);
    inputRef.current?.focus();
  };

  return (
    <div className="grid w-full gap-1.5">
      <Label htmlFor={value} className="sr-only px-2 text-muted-foreground">
        {value}
      </Label>
      <div className="relative">
        <InputWithAddons
          ref={inputRef}
          placeholder={placeholder}
          leading={<Search className="h-4 w-4" />}
          containerClassName="h-9 rounded-md border-input bg-background"
          autoFocus={autoFocus}
          className="pr-8 placeholder:text-muted-foreground"
          name={value}
          id={value}
          value={input || ""}
          onChange={(e) => {
            isUserInputRef.current = true;
            setInput(e.target.value);
          }}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {isFilterActive ? (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search filter"
              title="Clear search filter"
            >
              <X className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
