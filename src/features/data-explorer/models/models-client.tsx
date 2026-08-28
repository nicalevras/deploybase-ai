"use client";

import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-client-provider";
import { useAuthDialog } from "@/providers/auth-dialog-provider";
import { modelsColumns } from "./models-columns";
import { modelsDataOptions } from "./models-query-options";
import type { ModelsInfiniteQueryResponse, ModelsLogsMeta } from "./models-query-options";
import {
  filterFields as defaultFilterFields,
  modelsColumnOrder,
  sheetFields,
} from "./models-constants";
import type { ModelsColumnSchema, ModelsFacetMetadataSchema } from "./models-schema";
import type { ModelFavoriteKey } from "@/types/model-favorites";
import { type AccountUser } from "../table/account-components";
import {
  DataTableInfinite,
  type DataTableMeta,
} from "../table/data-table-infinite";
import { getFavoritesBroadcastId } from "@/lib/model-favorites/broadcast";
import { MODEL_FAVORITES_QUERY_KEY } from "@/lib/model-favorites/constants";
import { useModelsTableSearchState } from "./hooks/use-models-table-search-state";
import { useModelsFavoritesState } from "./hooks/use-models-favorites-state";
import { ModelsCheckedActionsIsland } from "./models-checked-actions-island";
import { Bot, Server, Wrench } from "lucide-react";

interface ModelsClientProps {
  initialFavoriteKeys?: ModelFavoriteKey[];
  isFavoritesMode?: boolean;
}

// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when rendered
import dynamic from "next/dynamic";

const LazyFavoritesRuntime = dynamic(() => import("./models-favorites-runtime"), {
  ssr: false, // Client-only - never SSR or prefetch
});

const LazyModelSheetCharts = dynamic(
  () => import("./model-sheet-charts").then((module) => ({
    default: module.ModelSheetCharts,
  })),
  {
    ssr: false, // Client-only - only loads when sheet is opened
  },
);

export function ModelsClient({ initialFavoriteKeys, isFavoritesMode }: ModelsClientProps = {}) {
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
  const { session, signOut, isPending: authPending } = useAuth();
  const { showSignIn, showSignUp } = useAuthDialog();
  const [isSigningOut, startSignOutTransition] = React.useTransition();
  const accountUser = (session?.user ?? null) as AccountUser | null;
  const broadcastId = React.useMemo(() => getFavoritesBroadcastId(), []);
  // Redirect unauthenticated users away from bookmarks mode
  React.useEffect(() => {
    if (effectiveFavoritesMode && !authPending && !session) {
      router.replace("/signin?callbackUrl=" + encodeURIComponent("/llms?bookmarks=true"));
    }
  }, [effectiveFavoritesMode, authPending, session, router]);

  const clearFavoriteQueries = React.useCallback(() => {
    queryClient.removeQueries({ queryKey: MODEL_FAVORITES_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["model-favorites", "rows"], exact: false });
  }, [queryClient]);

  const { favoritesSnapshot, handleFavoritesSnapshot, shouldHydrateFavorites } =
    useModelsFavoritesState({
      initialFavoriteKeys,
      effectiveFavoritesMode,
      queryClient,
    });
  const noopAsync = React.useCallback(async () => { }, []);

  const handleSignIn = React.useCallback(() => {
    if (!showSignIn) return;
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    showSignIn({ callbackUrl });
  }, [showSignIn]);

  const handleSignUp = React.useCallback(() => {
    if (!showSignUp) return;
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    showSignUp({ callbackUrl });
  }, [showSignUp]);

  const handleSignOut = React.useCallback(() => {
    startSignOutTransition(async () => {
      try {
        await signOut();
      } finally {
        clearFavoriteQueries();
        // Redirect to base path when signing out from bookmarks view
        if (effectiveFavoritesMode) {
          router.push("/llms");
        } else {
          router.refresh();
        }
      }
    });
  }, [clearFavoriteQueries, effectiveFavoritesMode, router, signOut]);

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
  type QueryData = InfiniteData<ModelsInfiniteQueryResponse<ModelsColumnSchema[], ModelsLogsMeta>, { cursor: number | null; size: number }>;
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
    return (data?.pages?.flatMap((page) => page.data ?? []) as ModelsColumnSchema[]) ?? ([] as ModelsColumnSchema[]);
  }, [data?.pages]);

  const baseLastPage = data?.pages?.[data?.pages.length - 1];
  const favoritesFlatData = favoritesSnapshot?.flatData ?? [];
  const favoritesLastPage = favoritesSnapshot?.lastPage;

  const flatData = effectiveFavoritesMode ? favoritesFlatData : baseFlatData;
  const lastPage = effectiveFavoritesMode ? favoritesLastPage : baseLastPage;
  const rawFacets = lastPage?.meta?.facets;
  const facetsRef = React.useRef<Record<string, ModelsFacetMetadataSchema> | undefined>(undefined);
  React.useEffect(() => {
    if (rawFacets && Object.keys(rawFacets).length) {
      facetsRef.current = rawFacets;
    }
  }, [rawFacets]);

  const navItems = React.useMemo(() => {
    if (!effectiveFavoritesMode) return undefined;
    return [
      { label: "GPUs", value: "/gpus", icon: Server },
      { label: "LLMs", value: "/llms", icon: Bot, isCurrent: true },
      { label: "Tools", value: "/tools", icon: Wrench },
    ];
  }, [effectiveFavoritesMode]);

  const stableFacets = React.useMemo(() => {
    if (rawFacets && Object.keys(rawFacets).length) {
      return rawFacets;
    }
    return facetsRef.current ?? {};
  }, [rawFacets]);
  const castFacets = stableFacets as Record<string, ModelsFacetMetadataSchema> | undefined;
  const effectiveFavoriteKeys = effectiveFavoritesMode
    ? favoritesSnapshot?.favoriteKeysFromRows ?? []
    : initialFavoriteKeys;

  const metadata: DataTableMeta<Record<string, unknown>, ModelFavoriteKey> = {
    ...(lastPage?.meta?.metadata ?? {}),
    totalRowCount: lastPage?.meta?.totalRowCount,
    filterRowCount: lastPage?.meta?.filterRowCount,
    initialFavoriteKeys: effectiveFavoriteKeys,
  };

  const tableIsFetching = effectiveFavoritesMode
    ? favoritesSnapshot?.isFetching ?? false
    : isFetching;
  const tableIsLoading = effectiveFavoritesMode
    ? favoritesSnapshot?.isFavoritesLoading ?? true
    : isLoading;
  const tableIsFetchingNextPage = effectiveFavoritesMode
    ? favoritesSnapshot?.isFetchingNextPage ?? false
    : isFetchingNextPage;
  const tableFetchNextPage = effectiveFavoritesMode
    ? favoritesSnapshot?.fetchNextPage ?? noopAsync
    : fetchNextPage;
  const tableHasNextPage = effectiveFavoritesMode
    ? favoritesSnapshot?.hasNextPage ?? false
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
        account={{
          user: accountUser,
          onSignOut: handleSignOut,
          isSigningOut,
          onSignIn: handleSignIn,
          onSignUp: handleSignUp,
          isLoading: authPending,
        }}
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
        getRowHref={(row) => row.permaslug ? `https://openrouter.ai/models/${row.permaslug}` : null}
        renderCheckedActions={(meta) => (
          <ModelsCheckedActionsIsland
            initialFavoriteKeys={meta.initialFavoriteKeys}
          />
        )}
      />
    </>
  );
}
