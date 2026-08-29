"use client";

import { isColumnFilterParameter } from "@/features/data-explorer/data-table/filter-state";
import type { DataTableFilterField } from "@/features/data-explorer/data-table/types";
import type {
  ColumnFiltersState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import * as React from "react";
import { searchParamsParser } from "../search-params";

type UseQueryStatesTuple = ReturnType<
  typeof useQueryStates<typeof searchParamsParser>
>;
type SearchParamsState = UseQueryStatesTuple[0];

export interface TableSearchState {
  search: SearchParamsState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  rowSelection: RowSelectionState;
  handleColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  handleSortingChange: OnChangeFn<SortingState>;
  handleRowSelectionChange: OnChangeFn<RowSelectionState>;
}

export function useTableSearchState(
  filterFields: DataTableFilterField<Record<string, unknown>>[],
): TableSearchState {
  const [search, setSearch] = useQueryStates(searchParamsParser);

  const {
    sort,
    size: _size,
    cursor: _cursor,
    observed_at: _observedAt,
    uuid: _uuid,
    search: globalSearch,
    ...filter
  } = search;

  const columnFilters = React.useMemo<ColumnFiltersState>(() => {
    const baseFilters = Object.entries(filter)
      .filter(([key]) => isColumnFilterParameter(key))
      .map(([key, value]) => ({
        id: key,
        value: value as unknown,
      }))
      .filter(({ value }) => value ?? undefined) as ColumnFiltersState;

    if (typeof globalSearch === "string" && globalSearch.trim().length) {
      baseFilters.push({ id: "search", value: globalSearch } as {
        id: string;
        value: unknown;
      });
    }

    return baseFilters;
  }, [filter, globalSearch]);

  const sorting = React.useMemo<SortingState>(() => {
    return sort ? [sort] : [];
  }, [sort]);

  // Keep selection local so URL stays clean during client navigation.
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    () => {
      return search.uuid ? { [search.uuid]: true } : {};
    },
  );

  // If a user lands on a shared link (uuid in URL), seed local selection once.
  React.useEffect(() => {
    const incomingUuid = search.uuid ?? null;
    setRowSelection((previous) => {
      const currentUuid = Object.keys(previous)[0] ?? null;
      if (incomingUuid === currentUuid) return previous;
      return incomingUuid ? { [incomingUuid]: true } : {};
    });
  }, [search.uuid]);

  const previousFilterPayloadRef = React.useRef<Record<string, unknown> | null>(
    null,
  );
  const handleColumnFiltersChange = React.useCallback<
    OnChangeFn<ColumnFiltersState>
  >(
    (updater) => {
      const nextFilters =
        typeof updater === "function"
          ? updater(columnFilters)
          : (updater ?? []);
      const searchPayload: Record<string, unknown> = {};

      filterFields.forEach((field) => {
        const columnFilter = nextFilters.find(
          (filter) => filter.id === field.value,
        );
        searchPayload[field.value as string] = columnFilter
          ? columnFilter.value
          : null;
      });

      if (
        previousFilterPayloadRef.current &&
        areSearchPayloadsEqual(previousFilterPayloadRef.current, searchPayload)
      ) {
        return;
      }

      previousFilterPayloadRef.current = searchPayload;
      setSearch((previous) => ({
        ...previous,
        ...searchPayload,
      }));
    },
    [columnFilters, filterFields, setSearch],
  );

  const previousSortParamRef = React.useRef<string>("__init__");
  const handleSortingChange = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : (updater ?? []);
      const sortEntry = nextSorting[0] ?? null;
      const serialized =
        sortEntry === null
          ? "null"
          : `${sortEntry.id}:${sortEntry.desc ? "desc" : "asc"}`;
      if (previousSortParamRef.current === serialized) {
        return;
      }
      previousSortParamRef.current = serialized;
      setSearch((previous) => ({
        ...previous,
        sort: sortEntry ?? null,
      }));
    },
    [setSearch, sorting],
  );

  const handleRowSelectionChange = React.useCallback<
    OnChangeFn<RowSelectionState>
  >((updater) => {
    setRowSelection((previous) => {
      const nextSelection =
        typeof updater === "function" ? updater(previous) : (updater ?? {});
      const selectedKeys = Object.keys(nextSelection ?? {});
      const nextUuid = selectedKeys[0];
      // Enforce single selection state, matching table config
      return nextUuid ? { [nextUuid]: true } : {};
    });
  }, []);

  return {
    search,
    columnFilters,
    sorting,
    rowSelection,
    handleColumnFiltersChange,
    handleSortingChange,
    handleRowSelectionChange,
  };
}

function areSearchPayloadsEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  const aEntries = Object.entries(a ?? {}).filter(
    ([_, value]) => value !== undefined,
  );
  const bEntries = Object.entries(b ?? {}).filter(
    ([_, value]) => value !== undefined,
  );
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([key, value]) => {
    const other = b[key];
    if (Array.isArray(value) && Array.isArray(other)) {
      if (value.length !== other.length) return false;
      return value.every(
        (val, index) => JSON.stringify(val) === JSON.stringify(other[index]),
      );
    }
    return JSON.stringify(value) === JSON.stringify(other);
  });
}
