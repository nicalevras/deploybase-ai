"use client";

import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-client-provider";
import { useAuthDialog } from "@/providers/auth-dialog-provider";
import { columns } from "./columns";
import {
  filterFields as defaultFilterFields,
  gpuColumnOrder,
  sheetFields,
} from "./constants";
import { DataTableInfinite } from "./data-table-infinite";
import type { DataTableMeta } from "./data-table-infinite";
import { dataOptions } from "./query-options";
import type { InfiniteQueryResponse, LogsMeta } from "./query-options";
import type { RowWithId } from "@/types/api";
import type { ColumnSchema, FacetMetadataSchema } from "./schema";
// Inline notices handle favorites feedback; no toasts here.
import { getFavoritesBroadcastId } from "@/lib/favorites/broadcast";
import { type AccountUser } from "./account-components";
import { FAVORITES_QUERY_KEY } from "@/lib/favorites/constants";
import { useTableSearchState } from "./hooks/use-table-search-state";
import { useFavoritesState } from "./hooks/use-favorites-state";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when rendered
import dynamic from "next/dynamic";
import { Bot, Server, Wrench } from "lucide-react";

interface ClientProps {
  initialFavoriteKeys?: string[];
  isFavoritesMode?: boolean;
}

const LazyFavoritesRuntime = dynamic(() => import("./favorites-runtime"), {
  ssr: false, // Client-only - never SSR or prefetch
});

export function Client({ initialFavoriteKeys, isFavoritesMode }: ClientProps = {}) {
  const contentRef = React.useRef<HTMLTableSectionElement>(null);
  const {
    search,
    columnFilters,
    sorting,
    rowSelection,
    handleColumnFiltersChange,
    handleSortingChange,
    handleRowSelectionChange,
  } = useTableSearchState(defaultFilterFields);
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
      router.replace("/signin?callbackUrl=" + encodeURIComponent("/gpus?bookmarks=true"));
    }
  }, [effectiveFavoritesMode, authPending, session, router]);

  const clearFavoriteQueries = React.useCallback(() => {
    queryClient.removeQueries({ queryKey: FAVORITES_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["favorites", "rows"], exact: false });
  }, [queryClient]);

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
          router.push("/gpus");
        } else {
          router.refresh();
        }
      }
    });
  }, [clearFavoriteQueries, effectiveFavoritesMode, router, signOut]);

  const { favoritesSnapshot, handleFavoritesSnapshot, shouldHydrateFavorites } =
    useFavoritesState({
      initialFavoriteKeys,
      effectiveFavoritesMode,
      queryClient,
    });
  const noopAsync = React.useCallback(async () => { }, []);


  const queryOptions = React.useMemo(() => {
    return {
      ...dataOptions(search),
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    };
  }, [search]);

  // Optimize client-side navigation: use cached data for instant rendering
  // initialData: Persists to cache, skips loading state, marks data as fresh
  // Docs: https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data
  type QueryData = InfiniteData<InfiniteQueryResponse<ColumnSchema[], LogsMeta>, { cursor: number | null; size: number }>;
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
    return (data?.pages?.flatMap((page) => page.data ?? []) as RowWithId[]) ?? ([] as RowWithId[]);
  }, [data?.pages]);
  const baseLastPage = data?.pages?.[data?.pages.length - 1];

  const favoritesFlatData = favoritesSnapshot?.flatData ?? [];
  const favoritesLastPage = favoritesSnapshot?.lastPage;

  const flatData = effectiveFavoritesMode ? favoritesFlatData : baseFlatData;
  const lastPage = effectiveFavoritesMode ? favoritesLastPage : baseLastPage;
  const facetsFromPage = lastPage?.meta?.facets;
  const effectiveFavoriteKeys = effectiveFavoritesMode
    ? favoritesSnapshot?.favoriteKeysFromRows ?? []
    : initialFavoriteKeys;

  const metadata: DataTableMeta<Record<string, unknown>> = {
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
  const facetsRef = React.useRef<Record<string, FacetMetadataSchema> | undefined>(undefined);
  React.useEffect(() => {
    if (facetsFromPage && Object.keys(facetsFromPage).length) {
      facetsRef.current = facetsFromPage;
    }
  }, [facetsFromPage]);
  const stableFacets = React.useMemo(() => {
    if (facetsFromPage && Object.keys(facetsFromPage).length) {
      return facetsFromPage;
    }
    return facetsRef.current ?? {};
  }, [facetsFromPage]);
  const castFacets = stableFacets as Record<string, FacetMetadataSchema> | undefined;

  // REMINDER: filter metadata is hydrated from the API so checkboxes/sliders stay accurate
  const filterFields = React.useMemo(() => {
    return defaultFilterFields.map((field) => {
      const facetsField = castFacets?.[field.value];
      if (!facetsField) return field;
      if (field.options && field.options.length > 0) return field;

      // REMINDER: if no options are set, we need to set them via the API
      // Filter rows to ensure they have the expected structure (same as models table)
      // Check if rows exists and is an array before processing
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
          options, // Use API-generated options for sliders
        };
      }

      // Only set options for checkbox fields, not input fields
      if (field.type === "checkbox") {
        return { ...field, options };
      }

      return field;
    });
  }, [castFacets]);

  const navItems = React.useMemo(() => {
    if (!effectiveFavoritesMode) return undefined;
    return [
      { label: "GPUs", value: "/gpus", icon: Server, isCurrent: true },
      { label: "LLMs", value: "/llms", icon: Bot },
      { label: "Tools", value: "/tools", icon: Wrench },
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
        key={`table-${effectiveFavoritesMode ? "favorites" : "all"}`}
        columns={columns}
        data={flatData}
        columnOrder={gpuColumnOrder}
        activeNavValue="/gpus"
        navItems={navItems}
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
        getRowId={(row) => row.uuid}
        renderSheetTitle={({ row }) => row?.original.gpu_model || "GPU Details"}
        focusTargetRef={contentRef}
        account={{
          user: accountUser,
          onSignOut: handleSignOut,
          isSigningOut,
          onSignIn: handleSignIn,
          onSignUp: handleSignUp,
          isLoading: authPending,
        }}
        primaryColumnId="gpu_model"
        getRowHref={(row) => row.source_url || null}
      />
    </>
  );
}
