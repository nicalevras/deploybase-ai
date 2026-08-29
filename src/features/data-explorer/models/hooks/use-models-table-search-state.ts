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
import type { ModalitiesDirection } from "../modalities-filter";
import { modelsSearchParamsParser } from "../models-search-params";

interface ModelsTableSearchState {
  search: ReturnType<typeof useQueryStates<typeof modelsSearchParamsParser>>[0];
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  rowSelection: RowSelectionState;
  handleColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  handleSortingChange: OnChangeFn<SortingState>;
  handleRowSelectionChange: OnChangeFn<RowSelectionState>;
}

export function useModelsTableSearchState(
  filterFields: DataTableFilterField<Record<string, unknown>>[],
): ModelsTableSearchState {
  const [search, setSearch] = useQueryStates(modelsSearchParamsParser);

  const {
    sort,
    size: _size,
    start: _start,
    direction: _direction,
    cursor: _cursor,
    uuid: _uuid,
    search: globalSearch,
    ...filter
  } = search;

  const columnFilters = React.useMemo<ColumnFiltersState>(() => {
    const baseFilters = Object.entries(filter)
      .filter(([key]) => isColumnFilterParameter(key))
      .map(([key, value]) => {
        if (key === "modalityDirections") {
          const parsed = deserializeModalityDirections(value);
          const hasDirections = Object.keys(parsed).length > 0;

          return {
            id: key,
            // Avoid keeping an always-truthy empty object so the reset button can disable
            value: hasDirections ? parsed : null,
          };
        }
        return {
          id: key,
          value: value as unknown,
        };
      })
      .filter(({ value }) => value ?? undefined) as ColumnFiltersState;

    if (typeof globalSearch === "string" && globalSearch.trim().length) {
      baseFilters.push({ id: "search", value: globalSearch });
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

  // Seed local selection from a shared link (uuid in URL) without mutating the URL.
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
        if (field.value === "modalities") {
          const modalitiesFilter = nextFilters.find(
            (filter) => filter.id === field.value,
          );
          const modalityValue = modalitiesFilter?.value as string[] | undefined;
          const values = modalityValue ?? [];

          const directionsFilter = nextFilters.find(
            (filter) => filter.id === "modalityDirections",
          );
          const directionsValue = directionsFilter?.value as
            | Record<string, ModalitiesDirection>
            | undefined;
          const directionEntries = directionsValue
            ? Object.entries(directionsValue)
                .map(([key, dir]) => `${key}:${dir}`)
                .sort()
            : [];

          searchPayload[field.value as string] = values.length ? values : null;
          searchPayload.modalityDirections =
            values.length && directionEntries.length ? directionEntries : null;
          return;
        }

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
      setSearch(searchPayload);
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
      setSearch({ sort: sortEntry ?? null });
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

function deserializeModalityDirections(
  value: unknown,
): Record<string, ModalitiesDirection> {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.reduce<Record<string, ModalitiesDirection>>((acc, entry) => {
      if (typeof entry !== "string") return acc;
      const [modality, direction] = entry.split(":");
      if (!modality || (direction !== "input" && direction !== "output")) {
        return acc;
      }
      if (direction === "input") {
        delete acc[modality];
        return acc;
      }
      acc[modality] = direction;
      return acc;
    }, {});
  }

  if (typeof value === "object") {
    return value as Record<string, ModalitiesDirection>;
  }

  return {};
}
