"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/custom/table";
import { Button } from "@/components/ui/button";
import { DataTableProvider } from "@/features/data-explorer/data-table/data-table-provider";
import { MemoizedDataTableSheetContent } from "@/features/data-explorer/data-table/data-table-sheet/data-table-sheet-content";
import { DataTableSheetDetails } from "@/features/data-explorer/data-table/data-table-sheet/data-table-sheet-details";
import type {
  DataTableFilterField,
  SheetField,
} from "@/features/data-explorer/data-table/types";
import { cn } from "@/lib/utils";
import type { FavoriteKey } from "@/types/favorites";
import { type FetchNextPageOptions } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  Row,
  RowSelectionState,
  SortingState,
  TableOptions,
  Table as TTable,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Bot, PanelLeftOpen, Server, Wrench } from "lucide-react";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when sheet is opened
import dynamic from "next/dynamic";
import * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { CheckedActionsIsland } from "./_components/checked-actions-island";
import { RowSkeletons } from "./_components/row-skeletons";
// Extracted sub-components and hooks
import { MemoizedRow } from "./data-table-row";
import { DataTableMobileFilters, DataTableSidebar } from "./data-table-sidebar";
import { useColumnResize } from "./hooks/use-column-resize";
import { useVirtualScroll } from "./hooks/use-virtual-scroll";

const LazyGpuSheetCharts = dynamic(
  () =>
    import("./gpu-sheet-charts").then((module) => ({
      default: module.GpuSheetCharts,
    })),
  {
    ssr: false, // Client-only - only loads when sheet is opened
  },
);

const noop = () => {};

export type NavItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  isCurrent?: boolean;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "GPUs", value: "/gpus", icon: Server, shortcut: "g" },
  { label: "LLMs", value: "/llms", icon: Bot, shortcut: "k" },
  { label: "MLOps", value: "/tools", icon: Wrench, shortcut: "e" },
];

// Note: chart groupings could be added later if needed
export type DataTableMeta<TMeta, TFavorite = FavoriteKey> = TMeta & {
  facets?: Record<string, any>;
  initialFavoriteKeys?: TFavorite[];
};

interface DataTableInfiniteProps<TData, TValue, TMeta, TFavorite> {
  columns: ColumnDef<TData, TValue>[];
  getRowClassName?: (row: Row<TData>) => string;
  // REMINDER: make sure to pass the correct id to access the rows
  getRowId?: TableOptions<TData>["getRowId"];
  data: TData[];
  columnOrder?: string[];
  // Number of skeleton rows to render while loading
  skeletonRowCount?: number;
  // Number of skeleton rows to render while loading the next page
  skeletonNextPageRowCount?: number;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  filterFields?: DataTableFilterField<TData>[];
  sheetFields?: SheetField<TData, TMeta>[];
  meta: DataTableMeta<TMeta, TFavorite>;
  isFetching?: boolean;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage: (
    options?: FetchNextPageOptions | undefined,
  ) => Promise<unknown>;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => Promise<unknown> | void;
  renderSheetTitle: (props: { row?: Row<TData> }) => React.ReactNode;
  // Optional ref target to programmatically focus the table body
  focusTargetRef?: React.Ref<HTMLTableSectionElement>;
  navItems?: NavItem[];
  activeNavValue?: string;
  renderCheckedActions?: (
    meta: DataTableMeta<TMeta, TFavorite>,
  ) => React.ReactNode;
  renderSheetCharts?: (row: Row<TData> | null) => React.ReactNode;
  primaryColumnId?: string;
  sheetContentClassName?: string;
  getRowHref?: (row: TData) => string | null;
  ctaLabel?: string;
}

export function DataTableInfinite<
  TData,
  TValue,
  TMeta,
  TFavorite = FavoriteKey,
>({
  columns,
  getRowClassName,
  getRowId,
  data,
  columnOrder,
  skeletonRowCount = 50,
  skeletonNextPageRowCount,
  columnFilters,
  onColumnFiltersChange,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  filterFields = [],
  sheetFields = [],
  isFetching,
  isLoading,
  isFetchingNextPage,
  fetchNextPage,
  hasNextPage,
  isError,
  error,
  onRetry = noop,
  meta,
  renderSheetTitle,
  focusTargetRef,
  navItems,
  activeNavValue,
  renderCheckedActions,
  renderSheetCharts,
  primaryColumnId = "gpu_model",
  sheetContentClassName,
  getRowHref,
  ctaLabel,
}: DataTableInfiniteProps<TData, TValue, TMeta, TFavorite>) {
  // Independent checkbox-only state (does not control the details pane)
  const [checkedRows, setCheckedRows] = React.useState<Record<string, boolean>>(
    {},
  );
  const missingRowIdWarningRef = React.useRef(false);
  const toggleCheckedRow = React.useCallback(
    (rowId: string, next?: boolean) => {
      setCheckedRows((prev) => {
        const shouldCheck = typeof next === "boolean" ? next : !prev[rowId];
        if (shouldCheck) return { ...prev, [rowId]: true };
        const { [rowId]: _omit, ...rest } = prev;
        return rest;
      });
    },
    [],
  );

  const tableRef = React.useRef<HTMLTableElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const resolvedNavItems = React.useMemo(() => {
    const baseItems: NavItem[] = navItems ?? DEFAULT_NAV_ITEMS;
    const inferredValueFromItems =
      baseItems.find((item) => item.isCurrent)?.value ?? null;
    const currentValue =
      activeNavValue ??
      inferredValueFromItems ??
      baseItems[0]?.value ??
      "/gpus";

    return baseItems.map((item) => ({
      ...item,
      isCurrent: item.value === currentValue,
    }));
  }, [activeNavValue, navItems]);

  // Bookmarks mode is indicated by explicit navItems being passed (clients only pass navItems in favorites mode)
  const isBookmarksMode = navItems !== undefined;
  const currentNavValue =
    resolvedNavItems.find((item) => item.isCurrent)?.value ?? "/gpus";

  const resolvedGetRowId = React.useMemo(() => {
    if (getRowId) {
      return getRowId;
    }

    return (originalRow: TData, index: number, _parent?: Row<TData>) => {
      if (
        originalRow &&
        typeof originalRow === "object" &&
        "id" in (originalRow as Record<string, unknown>)
      ) {
        const rawId = (originalRow as Record<string, unknown>).id;
        if (typeof rawId === "string" || typeof rawId === "number") {
          return String(rawId);
        }
      }

      if (
        process.env.NODE_ENV !== "production" &&
        !missingRowIdWarningRef.current
      ) {
        missingRowIdWarningRef.current = true;
        console.warn(
          "[DataTableInfinite] Falling back to index-based row ids. " +
            "Pass `getRowId` or ensure each row has a stable `id` to keep favorites in sync.",
        );
      }

      return String(index);
    };
  }, [getRowId]);

  const table = useReactTable({
    data,
    columns,
    // Server-side operations (TanStack Table best practice)
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    initialState: {
      ...(columnOrder ? { columnOrder } : {}),
      // Initialize from URL state (TanStack Table best practice)
      columnFilters,
      sorting,
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
    state: {
      columnFilters,
      sorting,
      rowSelection,
      ...(columnOrder ? { columnOrder } : {}),
    },
    enableMultiRowSelection: false,
    enableColumnResizing: true,
    enableMultiSort: false,
    columnResizeMode: "onChange",
    getRowId: resolvedGetRowId,
    onColumnFiltersChange,
    onRowSelectionChange,
    onSortingChange,
    enableHiding: false,
    enableSorting: true, // Enable sorting UI for manual server-side sorting
    getCoreRowModel: getCoreRowModel(),
    // Facets are provided by the server; expose them via provider callbacks
    // to power filter UIs without re-filtering rows client-side
    // Note: we intentionally do not call getFilteredRowModel/getFacetedRowModel
    debugAll: process.env.NEXT_PUBLIC_TABLE_DEBUG === "true",
    meta: {
      getRowClassName,
    },
  });

  // Table rows for rendering order
  const rows = table.getRowModel().rows;
  const primaryColumn = React.useMemo(
    () => table.getColumn(primaryColumnId),
    [primaryColumnId, table],
  );

  // Clear checked rows when filters change or data is empty
  // Do NOT prune checked rows when they scroll out of view - this preserves selection across scroll
  React.useEffect(() => {
    setCheckedRows((previous) => {
      if (Object.keys(previous).length === 0) {
        return previous;
      }
      return {};
    });
  }, [columnFilters, setCheckedRows]);

  // --- Virtual scroll hook ---
  const {
    overscan,
    isPrefetching,
    onScroll,
    virtualizationEnabled,
    virtualItems,
    totalSize,
    measureVirtualRow,
  } = useVirtualScroll({
    rows,
    containerRef,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    dataLength: data.length,
    sorting,
    columnFilters,
  });

  // --- Column resize hook ---
  const {
    getHeaderRef,
    modelColumnMeasuredWidthRef,
    modelColumnHasBeenResizedRef,
    pendingModelColumnResizeRef,
    minimumModelColumnWidth,
    modelColumnDefaultSize,
    getModelColumnWidth,
    fixedColumnsWidth,
  } = useColumnResize({
    table,
    primaryColumnId,
    primaryColumn,
  });

  const showErrorState = Boolean(isError);
  const errorMessage = React.useMemo(() => getErrorMessage(error), [error]);

  const selectedRow = React.useMemo(() => {
    if ((isLoading || isFetching) && !data.length) return;
    const selectedRowKey = Object.keys(rowSelection)?.[0];
    return table
      .getCoreRowModel()
      .flatRows.find((row) => row.id === selectedRowKey);
  }, [rowSelection, table, isLoading, isFetching, data]);

  // Selection sync limited to the current batch

  const getFacetedUniqueValues = React.useCallback(
    (table: TTable<TData>, columnId: string) => {
      const facets = meta.facets;
      if (!facets) return undefined;

      const facetData = facets[columnId];
      if (
        !facetData ||
        typeof facetData !== "object" ||
        !("rows" in facetData)
      ) {
        return new Map<string, number>();
      }

      const map = new Map<string, number>();
      facetData.rows.forEach((row: { value: unknown; total: number }) => {
        if (
          row &&
          typeof row === "object" &&
          "value" in row &&
          "total" in row
        ) {
          map.set(String(row.value), Number(row.total));
        }
      });

      return map;
    },
    [meta.facets],
  );

  const getFacetedMinMaxValues = React.useCallback(
    (table: TTable<TData>, columnId: string) => {
      const facets = meta.facets;
      if (!facets) return undefined;

      const facetData = facets[columnId];
      if (!facetData || typeof facetData !== "object" || !("rows" in facetData))
        return undefined;

      // For numeric columns, find min/max values
      const numericValues: number[] = facetData.rows
        .map((row: { value: unknown; total: number }) => {
          if (row && typeof row === "object" && "value" in row) {
            const num = Number(row.value);
            return isNaN(num) ? null : num;
          }
          return null;
        })
        .filter((val: number | null): val is number => val !== null);

      if (numericValues.length === 0) return undefined;

      return [Math.min(...numericValues), Math.max(...numericValues)] as [
        number,
        number,
      ];
    },
    [meta.facets],
  );

  const checkedActions = React.useMemo(() => {
    if (renderCheckedActions) {
      return renderCheckedActions(meta);
    }
    return (
      <CheckedActionsIsland
        initialFavoriteKeys={
          (meta.initialFavoriteKeys as FavoriteKey[] | undefined) ?? undefined
        }
      />
    );
  }, [meta, renderCheckedActions]);

  const activeProvider = columnFilters.find(
    (filter) => filter.id === "provider",
  )?.value;
  const activeModel = columnFilters.find(
    (filter) => filter.id === "gpu_model",
  )?.value;
  const firstFilterValue = (value: unknown) =>
    Array.isArray(value) ? value[0] : value;
  const providerLabel = String(firstFilterValue(activeProvider) ?? "").trim();
  const modelLabel = String(firstFilterValue(activeModel) ?? "").trim();
  let explorerTitle =
    currentNavValue === "/llms"
      ? "LLM inference"
      : currentNavValue === "/tools"
        ? "MLOps directory"
        : "GPU cloud pricing";
  if (currentNavValue === "/llms" && providerLabel) {
    explorerTitle = `${providerLabel} LLM inference`;
  } else if (modelLabel) {
    explorerTitle = `${modelLabel} pricing`;
  } else if (providerLabel) {
    explorerTitle = `${providerLabel} GPU pricing`;
  }

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      rowSelection={rowSelection}
      checkedRows={checkedRows}
      toggleCheckedRow={toggleCheckedRow}
      setCheckedRows={setCheckedRows}
      setColumnFilters={
        onColumnFiltersChange as Dispatch<SetStateAction<ColumnFiltersState>>
      }
      setRowSelection={
        onRowSelectionChange as Dispatch<SetStateAction<RowSelectionState>>
      }
      enableColumnOrdering={false}
      isLoading={isFetching || isLoading}
      getFacetedUniqueValues={getFacetedUniqueValues}
      getFacetedMinMaxValues={getFacetedMinMaxValues}
    >
      <div className="flex h-[calc(100dvh-var(--app-header-height))] min-h-0 flex-col overflow-hidden bg-background">
        <h1 className="sr-only">{explorerTitle}</h1>
        <div className="relative flex min-h-0 flex-1">
          <DataTableMobileFilters />
          {filtersOpen ? (
            <DataTableSidebar onCollapse={() => setFiltersOpen(false)} />
          ) : null}
          {!filtersOpen ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute bottom-4 left-4 z-40 hidden bg-card shadow-sm sm:inline-flex"
              onClick={() => setFiltersOpen(true)}
              title="Show filters"
              aria-label="Show filters"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : null}
          <div
            className={cn("flex min-w-0 max-w-full flex-1 flex-col")}
            data-table-container=""
          >
            <div className="z-0 flex min-h-0 flex-1 flex-col">
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col overflow-hidden bg-site-chrome",
                )}
              >
                <Table
                  ref={tableRef}
                  onScroll={onScroll}
                  containerRef={containerRef}
                  containerOverflowVisible={false}
                  // REMINDER: https://stackoverflow.com/questions/questions/50361698/border-style-do-not-work-with-sticky-position-element
                  className="w-full table-fixed border-separate border-spacing-0"
                  style={{
                    width: "100%",
                    minWidth: `${fixedColumnsWidth + minimumModelColumnWidth}px`,
                  }}
                  containerClassName={cn(
                    "scrollbar-hide h-full min-h-0 flex-1 overscroll-x-none",
                  )}
                >
                  <TableHeader className={cn("sticky top-0 z-50 bg-muted")}>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted">
                        {headerGroup.headers.map((header) => {
                          const isModelColumn = primaryColumnId
                            ? header.id === primaryColumnId
                            : false;
                          const headerRef = getHeaderRef(header.id);

                          // Custom resize handler that captures the actual rendered width when using "auto"
                          // Following React best practices: refs accessed only in event handlers, not during render
                          // Production-ready: includes null checks, proper cleanup, and browser compatibility
                          // Note: Regular function (not useCallback) because we're inside a map callback
                          // This is fine - function is recreated per header but only executes on user interaction
                          const handleResizeStart = (
                            e:
                              | React.MouseEvent<HTMLDivElement>
                              | React.TouchEvent<HTMLDivElement>,
                          ) => {
                            const resizeHandler = header.getResizeHandler();
                            if (!resizeHandler) {
                              return;
                            }

                            if (!isModelColumn) {
                              resizeHandler(e);
                              return;
                            }

                            if (pendingModelColumnResizeRef.current) {
                              return;
                            }

                            const columnSizing = table.getState().columnSizing;
                            const hasBeenResized =
                              header.id in columnSizing ||
                              modelColumnHasBeenResizedRef.current;

                            if (
                              !hasBeenResized &&
                              header.getSize() === modelColumnDefaultSize
                            ) {
                              modelColumnHasBeenResizedRef.current = true;
                              pendingModelColumnResizeRef.current = true;

                              const fallbackSize = header.getSize();
                              const measuredWidth =
                                modelColumnMeasuredWidthRef.current ??
                                fallbackSize;
                              const widthToSet =
                                measuredWidth && measuredWidth > 0
                                  ? Math.max(
                                      measuredWidth,
                                      fallbackSize,
                                      minimumModelColumnWidth,
                                    )
                                  : Math.max(
                                      fallbackSize,
                                      minimumModelColumnWidth,
                                    );

                              const currentSizing =
                                table.getState().columnSizing;
                              table.setColumnSizing({
                                ...currentSizing,
                                [header.id]: widthToSet,
                              });

                              const syntheticEvent = {
                                ...e,
                                currentTarget: e.currentTarget,
                                target: e.target,
                              } as typeof e;

                              requestAnimationFrame(() => {
                                const handler = header.getResizeHandler();
                                if (!handler) {
                                  pendingModelColumnResizeRef.current = false;
                                  return;
                                }
                                handler(syntheticEvent);
                                pendingModelColumnResizeRef.current = false;
                              });

                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }

                            modelColumnHasBeenResizedRef.current = true;
                            resizeHandler(e);
                          };

                          return (
                            <TableHead
                              key={header.id}
                              ref={headerRef}
                              className={cn(
                                "relative select-none truncate border-b border-t-0 border-border bg-muted text-foreground [&>.cursor-col-resize]:last:opacity-0",
                                header.column.columnDef.meta?.headerClassName,
                              )}
                              data-column-id={header.column.id}
                              style={{
                                width: getModelColumnWidth(
                                  header.id,
                                  header.getSize(),
                                ),
                                minWidth: isModelColumn
                                  ? `${minimumModelColumnWidth}px`
                                  : header.column.columnDef.minSize,
                              }}
                              aria-sort={
                                header.column.getIsSorted() === "asc"
                                  ? "ascending"
                                  : header.column.getIsSorted() === "desc"
                                    ? "descending"
                                    : "none"
                              }
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                              {header.column.getCanResize() && (
                                <div
                                  onDoubleClick={() => {
                                    // Reset all resize tracking state
                                    modelColumnMeasuredWidthRef.current = null;
                                    modelColumnHasBeenResizedRef.current =
                                      false;
                                    // Clear the column from sizing state so it can return to "auto"
                                    const currentSizing =
                                      table.getState().columnSizing;
                                    const { [header.id]: _, ...restSizing } =
                                      currentSizing;
                                    table.setColumnSizing(restSizing);
                                    header.column.resetSize();
                                  }}
                                  onMouseDown={
                                    isModelColumn
                                      ? handleResizeStart
                                      : header.getResizeHandler()
                                  }
                                  onTouchStart={
                                    isModelColumn
                                      ? handleResizeStart
                                      : header.getResizeHandler()
                                  }
                                  className={cn(
                                    "user-select-none absolute -right-2 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none justify-center",
                                    "before:absolute before:inset-y-0 before:w-px before:translate-x-px before:bg-border",
                                  )}
                                />
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody
                    id="content"
                    tabIndex={-1}
                    ref={focusTargetRef}
                    className="outline-1 -outline-offset-1 outline-primary transition-colors focus-visible:outline"
                    // REMINDER: avoids scroll (skipping the table header) when using skip to content
                    style={{
                      scrollMarginTop: "40px",
                    }}
                    aria-busy={Boolean(
                      isLoading || (isFetching && !data.length),
                    )}
                    aria-live="polite"
                  >
                    {showErrorState ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="py-10">
                          <div className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive-foreground sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">
                                We couldn&apos;t load GPU rows.
                              </p>
                              <p className="text-muted-foreground">
                                {errorMessage}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => {
                                if (typeof onRetry === "function") {
                                  void onRetry();
                                }
                              }}
                            >
                              Retry
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : isLoading || (isFetching && !data.length) ? (
                      <RowSkeletons
                        table={table}
                        rows={skeletonRowCount}
                        modelColumnWidth={`${minimumModelColumnWidth}px`}
                        primaryColumnId={primaryColumnId}
                      />
                    ) : rows.length ? (
                      <>
                        {!virtualizationEnabled && rows.length ? (
                          rows.map((row, index) => (
                            <React.Fragment key={row.id}>
                              <MemoizedRow
                                row={row}
                                table={table}
                                selected={row.getIsSelected()}
                                checked={checkedRows[row.id] ?? false}
                                data-index={index}
                                getModelColumnWidth={getModelColumnWidth}
                                primaryColumnId={primaryColumnId}
                              />
                            </React.Fragment>
                          ))
                        ) : virtualItems.length === 0 ? (
                          <RowSkeletons
                            table={table}
                            rows={Math.min(rows.length || skeletonRowCount, 50)}
                            modelColumnWidth={`${minimumModelColumnWidth}px`}
                            primaryColumnId={primaryColumnId}
                          />
                        ) : (
                          <>
                            {/* Virtual spacer for rows before visible range */}
                            {virtualItems[0]?.index > 0 && (
                              <tr
                                aria-hidden
                                style={{
                                  height: `${virtualItems[0].start}px`,
                                  border: 0,
                                }}
                              >
                                <td
                                  colSpan={columns.length}
                                  style={{ padding: 0, border: 0 }}
                                />
                              </tr>
                            )}
                            {/* Render only visible virtual items (reduces DOM size) */}
                            {virtualItems.map((virtualItem) => {
                              const row = rows[virtualItem.index];
                              if (!row) return null;

                              return (
                                <React.Fragment key={virtualItem.key}>
                                  <MemoizedRow
                                    row={row}
                                    table={table}
                                    selected={row.getIsSelected()}
                                    checked={checkedRows[row.id] ?? false}
                                    data-index={virtualItem.index}
                                    ref={measureVirtualRow}
                                    getModelColumnWidth={getModelColumnWidth}
                                    primaryColumnId={primaryColumnId}
                                  />
                                </React.Fragment>
                              );
                            })}
                            {/* Virtual spacer for rows after visible range */}
                            {virtualItems[virtualItems.length - 1]?.index <
                              rows.length - 1 && (
                              <tr
                                aria-hidden
                                style={{
                                  height: `${totalSize - virtualItems[virtualItems.length - 1].end}px`,
                                  border: 0,
                                }}
                              >
                                <td
                                  colSpan={columns.length}
                                  style={{ padding: 0, border: 0 }}
                                />
                              </tr>
                            )}
                          </>
                        )}
                        {hasNextPage &&
                          (isFetchingNextPage || isPrefetching) && (
                            <RowSkeletons
                              table={table}
                              rows={
                                typeof skeletonNextPageRowCount === "number"
                                  ? skeletonNextPageRowCount
                                  : Math.max(overscan * 2, 20)
                              }
                              modelColumnWidth={`${minimumModelColumnWidth}px`}
                              primaryColumnId={primaryColumnId}
                            />
                          )}
                      </>
                    ) : (
                      <React.Fragment>
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                          >
                            No results.
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DataTableSheetDetails
        title={renderSheetTitle({ row: selectedRow })}
        titleClassName="font-sans"
        getRowHref={getRowHref ? (row) => getRowHref(row as TData) : undefined}
        ctaLabel={ctaLabel}
      >
        <div className="space-y-0">
          <MemoizedDataTableSheetContent
            table={table}
            data={selectedRow?.original}
            filterFields={filterFields}
            fields={sheetFields}
            className={sheetContentClassName}
            // Memoization can be added later if needed
            // REMINDER: this is used to pass additional data like the `InfiniteQueryMeta`
            metadata={meta}
          />
          {(() => {
            const chartsNode = renderSheetCharts ? (
              renderSheetCharts(selectedRow ?? null)
            ) : selectedRow?.original &&
              typeof selectedRow.original === "object" &&
              "stable_key" in selectedRow.original ? (
              <LazyGpuSheetCharts
                stableKey={
                  (selectedRow.original as Record<string, unknown>)
                    .stable_key as string | undefined
                }
                provider={
                  (selectedRow.original as Record<string, unknown>).provider as
                    | string
                    | undefined
                }
              />
            ) : null;

            if (!chartsNode) return null;

            return (
              <div className="border-t border-border/60 px-5 pt-4">
                {chartsNode}
              </div>
            );
          })()}
        </div>
      </DataTableSheetDetails>
      {checkedActions}
    </DataTableProvider>
  );
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return "Something went wrong while fetching data.";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message || "Request failed.";
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Request failed.";
  }
}
