"use client";

import { getToolFavoritesBroadcastId } from "@/lib/tool-favorites/broadcast";
import { useAuth } from "@/providers/auth-client-provider";
import type { ToolFavoriteKey } from "@/types/tool-favorites";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Bot, Server, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useStableFacets } from "../data-table/use-stable-facets";
import { stableToolKey } from "../stable-keys";
import {
  DataTableInfinite,
  type DataTableMeta,
} from "../table/data-table-infinite";
import { useToolsFavoritesState } from "./hooks/use-tools-favorites-state";
import { useToolsTableSearchState } from "./hooks/use-tools-table-search-state";
import { ToolsCheckedActionsIsland } from "./tools-checked-actions-island";
import { toolsColumns } from "./tools-columns";
import {
  filterFields as defaultFilterFields,
  sheetFields,
  toolsColumnOrder,
} from "./tools-constants";
import {
  toolsDataOptions,
  type ToolInfiniteQueryResponse,
  type ToolLogsMeta,
} from "./tools-query-options";
import type {
  ToolColumnSchema,
  ToolsFacetMetadataSchema,
} from "./tools-schema";

const LazyFavoritesRuntime = dynamic(
  () => import("./tools-favorites-runtime"),
  {
    ssr: false, // Client-only - never SSR or prefetch
  },
);

interface ToolsClientProps {
  initialFavoriteKeys?: ToolFavoriteKey[];
  isFavoritesMode?: boolean;
}

export function ToolsClient({
  initialFavoriteKeys,
  isFavoritesMode,
}: ToolsClientProps = {}) {
  const contentRef = React.useRef<HTMLTableSectionElement>(null);
  const {
    search,
    columnFilters,
    sorting,
    rowSelection,
    handleColumnFiltersChange,
    handleSortingChange,
    handleRowSelectionChange,
  } = useToolsTableSearchState(defaultFilterFields);

  const bookmarksFlag = search.bookmarks === "true";
  const effectiveFavoritesMode =
    typeof isFavoritesMode === "boolean" ? isFavoritesMode : bookmarksFlag;

  const queryClient = useQueryClient();
  const router = useRouter();
  const { session, isPending: authPending } = useAuth();
  const broadcastId = React.useMemo(() => getToolFavoritesBroadcastId(), []);

  // Redirect unauthenticated users away from bookmarks mode
  React.useEffect(() => {
    if (effectiveFavoritesMode && !authPending && !session) {
      router.replace(
        "/signin?callbackUrl=" + encodeURIComponent("/tools?bookmarks=true"),
      );
    }
  }, [effectiveFavoritesMode, authPending, session, router]);

  const { favoritesSnapshot, handleFavoritesSnapshot, shouldHydrateFavorites } =
    useToolsFavoritesState({
      initialFavoriteKeys,
      effectiveFavoritesMode,
      queryClient,
    });
  const noopAsync = React.useCallback(async () => {}, []);

  const queryOptions = React.useMemo(() => {
    return {
      ...toolsDataOptions(search),
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    };
  }, [search]);
  type QueryData = InfiniteData<
    ToolInfiniteQueryResponse<ToolColumnSchema[], ToolLogsMeta>,
    { cursor: number | null; size: number }
  >;
  const cachedData = queryClient.getQueryData<QueryData>(queryOptions.queryKey);
  const cachedState = queryClient.getQueryState(queryOptions.queryKey);

  const {
    data,
    isFetching,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    ...queryOptions,
    enabled: !effectiveFavoritesMode,
    ...(cachedData
      ? {
          initialData: cachedData,
          initialDataUpdatedAt: cachedState?.dataUpdatedAt,
        }
      : {}),
  });

  const baseFlatData = React.useMemo(() => {
    return (
      (data?.pages?.flatMap((page) => page.data ?? []) as ToolColumnSchema[]) ??
      []
    );
  }, [data?.pages]);
  const baseLastPage = data?.pages?.[data?.pages.length - 1];

  const favoritesFlatData = favoritesSnapshot?.flatData ?? [];
  const favoritesLastPage = favoritesSnapshot?.lastPage;

  const flatData = effectiveFavoritesMode ? favoritesFlatData : baseFlatData;
  const lastPage = effectiveFavoritesMode ? favoritesLastPage : baseLastPage;
  const rawFacets = lastPage?.meta?.facets;
  const stableFacets = useStableFacets(rawFacets);
  const castFacets = stableFacets as
    | Record<string, ToolsFacetMetadataSchema>
    | undefined;
  const effectiveFavoriteKeys = effectiveFavoritesMode
    ? (favoritesSnapshot?.favoriteKeysFromRows ?? [])
    : initialFavoriteKeys;

  const metadata: DataTableMeta<Record<string, unknown>, ToolFavoriteKey> = {
    ...(lastPage?.meta?.metadata ?? {}),
    totalRowCount: lastPage?.meta?.totalRowCount,
    filterRowCount: lastPage?.meta?.filterRowCount,
    initialFavoriteKeys: effectiveFavoriteKeys,
  };

  const tableIsFetching = effectiveFavoritesMode
    ? (favoritesSnapshot?.isFetching ?? false)
    : isFetching;
  const tableIsLoading = effectiveFavoritesMode
    ? (favoritesSnapshot?.isFavoritesLoading ?? true)
    : isLoading;
  const tableIsFetchingNextPage = effectiveFavoritesMode
    ? (favoritesSnapshot?.isFetchingNextPage ?? false)
    : isFetchingNextPage;
  const tableFetchNextPage = effectiveFavoritesMode
    ? (favoritesSnapshot?.fetchNextPage ?? noopAsync)
    : fetchNextPage;
  const tableHasNextPage = effectiveFavoritesMode
    ? (favoritesSnapshot?.hasNextPage ?? false)
    : hasNextPage;
  const tableIsError = effectiveFavoritesMode ? false : isError;
  const tableError = effectiveFavoritesMode ? null : error;
  const tableRetry = effectiveFavoritesMode ? noopAsync : refetch;

  const filterFields = React.useMemo(() => {
    return defaultFilterFields.map((field) => {
      const facetsField = castFacets?.[field.value];
      if (!facetsField) return field;
      if (field.options && field.options.length > 0) return field;

      if (!facetsField.rows || !Array.isArray(facetsField.rows)) {
        return field;
      }

      const options = facetsField.rows
        .filter((row) => row && typeof row === "object" && "value" in row)
        .map(({ value }) => {
          const label = value == null ? "Unknown" : String(value);
          return { label, value };
        });

      if (field.type === "checkbox") {
        return { ...field, options };
      }

      return field;
    });
  }, [castFacets]);

  const navItems = React.useMemo(() => {
    if (!effectiveFavoritesMode) return undefined;
    return [
      { label: "GPUs", value: "/gpus", icon: Server },
      { label: "LLMs", value: "/llms", icon: Bot },
      { label: "Tools", value: "/tools", icon: Wrench, isCurrent: true },
    ];
  }, [effectiveFavoritesMode]);

  return (
    <>
      {shouldHydrateFavorites ? (
        <LazyFavoritesRuntime
          search={search}
          isActive={effectiveFavoritesMode}
          session={session}
          authPending={authPending}
          onStateChange={handleFavoritesSnapshot}
          broadcastId={broadcastId}
        />
      ) : null}
      <DataTableInfinite
        key={`tools-table-${effectiveFavoritesMode ? "favorites" : "all"}`}
        columns={toolsColumns}
        columnOrder={toolsColumnOrder}
        activeNavValue="/tools"
        navItems={navItems}
        data={flatData}
        skeletonRowCount={50}
        skeletonNextPageRowCount={undefined}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        meta={{ ...metadata, facets: castFacets }}
        filterFields={filterFields}
        sheetFields={sheetFields}
        isFetching={tableIsFetching}
        isLoading={tableIsLoading}
        isFetchingNextPage={tableIsFetchingNextPage}
        fetchNextPage={tableFetchNextPage}
        hasNextPage={tableHasNextPage}
        isError={tableIsError}
        error={tableError}
        onRetry={tableRetry}
        getRowClassName={() => "opacity-100"}
        renderSheetTitle={({ row }) => row?.original.name || "Tool Details"}
        getRowId={(row) => row.stable_key || stableToolKey(row)}
        focusTargetRef={contentRef}
        primaryColumnId="description"
        renderSheetCharts={() => null}
        sheetContentClassName="border-b border-border/60"
        getRowHref={(row) => row.url || null}
        ctaLabel="Learn More"
        renderCheckedActions={(meta) => (
          <ToolsCheckedActionsIsland
            initialFavoriteKeys={meta.initialFavoriteKeys}
          />
        )}
      />
    </>
  );
}
