"use client";

import { getFavoritesBroadcastId } from "@/lib/model-favorites/broadcast";
import { useAuth } from "@/providers/auth-client-provider";
import type { ModelFavoriteKey } from "@/types/model-favorites";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Bot, Server, Wrench } from "lucide-react";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when rendered
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useStableFacets } from "../data-table/use-stable-facets";
import {
  DataTableInfinite,
  type DataTableMeta,
} from "../table/data-table-infinite";
import { useModelsFavoritesState } from "./hooks/use-models-favorites-state";
import { useModelsTableSearchState } from "./hooks/use-models-table-search-state";
import { ModelsCheckedActionsIsland } from "./models-checked-actions-island";
import { modelsColumns } from "./models-columns";
import {
  filterFields as defaultFilterFields,
  modelsColumnOrder,
  sheetFields,
} from "./models-constants";
import { modelsDataOptions } from "./models-query-options";
import type {
  ModelsInfiniteQueryResponse,
  ModelsLogsMeta,
} from "./models-query-options";
import type {
  ModelsColumnSchema,
  ModelsFacetMetadataSchema,
} from "./models-schema";

interface ModelsClientProps {
  initialFavoriteKeys?: ModelFavoriteKey[];
  isFavoritesMode?: boolean;
}

const LazyFavoritesRuntime = dynamic(
  () => import("./models-favorites-runtime"),
  {
    ssr: false, // Client-only - never SSR or prefetch
  },
);

const LazyModelSheetCharts = dynamic(
  () =>
    import("./model-sheet-charts").then((module) => ({
      default: module.ModelSheetCharts,
    })),
  {
    ssr: false, // Client-only - only loads when sheet is opened
  },
);

export function ModelsClient({
  initialFavoriteKeys,
  isFavoritesMode,
}: ModelsClientProps = {}) {
  const contentRef = React.useRef<HTMLTableSectionElement>(null);
  const {
    search,
    columnFilters,
    sorting,
    rowSelection,
    handleColumnFiltersChange,
    handleSortingChange,
    handleRowSelectionChange,
  } = useModelsTableSearchState(defaultFilterFields);
  const bookmarksFlag = search.bookmarks === "true";
  const effectiveFavoritesMode =
    typeof isFavoritesMode === "boolean" ? isFavoritesMode : bookmarksFlag;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { session, isPending: authPending } = useAuth();
  const broadcastId = React.useMemo(() => getFavoritesBroadcastId(), []);
  // Redirect unauthenticated users away from bookmarks mode
  React.useEffect(() => {
    if (effectiveFavoritesMode && !authPending && !session) {
      router.replace(
        "/signin?callbackUrl=" + encodeURIComponent("/llms?bookmarks=true"),
      );
    }
  }, [effectiveFavoritesMode, authPending, session, router]);

  const { favoritesSnapshot, handleFavoritesSnapshot, shouldHydrateFavorites } =
    useModelsFavoritesState({
      initialFavoriteKeys,
      effectiveFavoritesMode,
      queryClient,
    });
  const noopAsync = React.useCallback(async () => {}, []);

  const queryOptions = React.useMemo(() => {
    return {
      ...modelsDataOptions(search),
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    };
  }, [search]);

  // Optimize client-side navigation: use cached data for instant rendering
  // initialData: Persists to cache, skips loading state, marks data as fresh
  // Docs: https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data
  type QueryData = InfiniteData<
    ModelsInfiniteQueryResponse<ModelsColumnSchema[], ModelsLogsMeta>,
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
    // Use cached data as initialData for client-side navigation
    // This persists to cache and skips loading state for instant rendering
    // HydrationBoundary handles server-side hydration automatically
    // Only set initialData if cached data exists (avoids redundant placeholderData)
    ...(cachedData
      ? {
          initialData: cachedData,
          initialDataUpdatedAt: cachedState?.dataUpdatedAt,
        }
      : {}),
  });

  const baseFlatData = React.useMemo(() => {
    return (
      (data?.pages?.flatMap(
        (page) => page.data ?? [],
      ) as ModelsColumnSchema[]) ?? ([] as ModelsColumnSchema[])
    );
  }, [data?.pages]);

  const baseLastPage = data?.pages?.[data?.pages.length - 1];
  const favoritesFlatData = favoritesSnapshot?.flatData ?? [];
  const favoritesLastPage = favoritesSnapshot?.lastPage;

  const flatData = effectiveFavoritesMode ? favoritesFlatData : baseFlatData;
  const lastPage = effectiveFavoritesMode ? favoritesLastPage : baseLastPage;
  const rawFacets = lastPage?.meta?.facets;

  const navItems = React.useMemo(() => {
    if (!effectiveFavoritesMode) return undefined;
    return [
      { label: "GPUs", value: "/gpus", icon: Server },
      { label: "LLMs", value: "/llms", icon: Bot, isCurrent: true },
      { label: "Tools", value: "/tools", icon: Wrench },
    ];
  }, [effectiveFavoritesMode]);

  const stableFacets = useStableFacets(rawFacets);
  const castFacets = stableFacets as
    | Record<string, ModelsFacetMetadataSchema>
    | undefined;
  const effectiveFavoriteKeys = effectiveFavoritesMode
    ? (favoritesSnapshot?.favoriteKeysFromRows ?? [])
    : initialFavoriteKeys;

  const metadata: DataTableMeta<Record<string, unknown>, ModelFavoriteKey> = {
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

      if (field.type === "slider") {
        return {
          ...field,
          min: facetsField.min ?? field.min,
          max: facetsField.max ?? field.max,
          options,
        };
      }

      if (field.type === "checkbox") {
        return { ...field, options };
      }

      return field;
    });
  }, [castFacets]);

  return (
    <>
      {shouldHydrateFavorites ? (
        <LazyFavoritesRuntime
          search={search}
          isActive={effectiveFavoritesMode}
          session={session}
          authPending={authPending}
          broadcastId={broadcastId}
          onStateChange={handleFavoritesSnapshot}
        />
      ) : null}
      <DataTableInfinite
        key={`models-table-${effectiveFavoritesMode ? "favorites" : "all"}`}
        columns={modelsColumns}
        columnOrder={modelsColumnOrder}
        activeNavValue="/llms"
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
        renderSheetTitle={({ row }) => {
          if (!row) return "AI Model Details";
          const model = row.original as ModelsColumnSchema;
          return model.shortName || model.name || "Model Details";
        }}
        getRowId={(row) => row.id}
        focusTargetRef={contentRef}
        primaryColumnId="name"
        renderSheetCharts={(row) => {
          const selectedModel = row?.original as ModelsColumnSchema | undefined;
          if (!selectedModel?.permaslug || !selectedModel?.endpointId) {
            return null;
          }

          return (
            <LazyModelSheetCharts
              permaslug={selectedModel.permaslug}
              endpointId={selectedModel.endpointId}
              provider={selectedModel?.provider}
              throughput={selectedModel?.throughput}
            />
          );
        }}
        getRowHref={(row) =>
          row.permaslug ? `https://openrouter.ai/models/${row.permaslug}` : null
        }
        renderCheckedActions={(meta) => (
          <ModelsCheckedActionsIsland
            initialFavoriteKeys={meta.initialFavoriteKeys}
          />
        )}
      />
    </>
  );
}
