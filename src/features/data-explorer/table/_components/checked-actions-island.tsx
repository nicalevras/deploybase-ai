"use client";

import { Button } from "@/components/ui/button";
import { useDataTable } from "@/features/data-explorer/data-table/data-table-provider";
import { stableGpuKey } from "@/features/data-explorer/stable-keys";
import type {
  InfiniteQueryResponse,
  LogsMeta,
} from "@/features/data-explorer/table/query-options";
import type { ColumnSchema } from "@/features/data-explorer/table/schema";
import { useEphemeralNotice } from "@/hooks/use-ephemeral-notice";
import {
  addFavorites,
  FavoritesAPIError,
  getFavorites,
  removeFavorites,
} from "@/lib/favorites/api-client";
import { getFavoritesBroadcastId } from "@/lib/favorites/broadcast";
import {
  FAVORITES_BROADCAST_CHANNEL,
  FAVORITES_QUERY_KEY,
} from "@/lib/favorites/constants";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-client-provider";
import { useAuthDialog } from "@/providers/auth-dialog-provider";
import type { FavoriteKey } from "@/types/favorites";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Row } from "@tanstack/react-table";
import { Bookmark, GitCompare } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { CompareDialog } from "./compare-dialog";
import { FavoritesNotice } from "./favorites-notice";

export function CheckedActionsIsland({
  initialFavoriteKeys,
}: {
  initialFavoriteKeys?: FavoriteKey[];
}) {
  "use no memo";
  // Opt out of React Compiler — `table` from context is a stable reference
  // (TanStack mutates internally), so the compiler incorrectly caches method results.
  const { checkedRows, table } = useDataTable<ColumnSchema, unknown>();
  const queryClient = useQueryClient();
  const bcRef = React.useRef<BroadcastChannel | null>(null);
  const isMountedRef = React.useRef(true);
  const {
    message: favoritesNotice,
    isOpen: isFavoritesOpen,
    show: showFavoritesNotice,
  } = useEphemeralNotice(1600);
  const [noticeVariant, setNoticeVariant] = React.useState<"success" | "error">(
    "success",
  );
  const { showSignIn } = useAuthDialog();
  const { session, isPending: authPending } = useAuth();
  const broadcastId = React.useMemo(() => getFavoritesBroadcastId(), []);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  const promptForAuth = React.useCallback(() => {
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    showSignIn({ callbackUrl });
  }, [showSignIn]);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const flatRows = table.getRowModel().flatRows;
  const visibleRowIds = React.useMemo(
    () => new Set(flatRows.map((row) => row.id)),
    [flatRows],
  );
  const selectedRows = React.useMemo<Row<ColumnSchema>[]>(() => {
    return table
      .getRowModel()
      .flatRows.filter((row) => checkedRows[row.id]) as Row<ColumnSchema>[];
  }, [table, checkedRows]);
  const compareRows = React.useMemo(
    () => selectedRows.slice(0, 2),
    [selectedRows],
  );
  const selectedRowCount = selectedRows.length;

  const hasSelection = React.useMemo(() => {
    for (const key in checkedRows) {
      if (visibleRowIds.has(key)) {
        return true;
      }
    }
    return false;
  }, [checkedRows, visibleRowIds]);

  // Seed React Query cache with initialFavoriteKeys if provided (from SSR)
  React.useEffect(() => {
    if (initialFavoriteKeys) {
      const existing =
        queryClient.getQueryData<FavoriteKey[]>(FAVORITES_QUERY_KEY);
      if (!existing) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, initialFavoriteKeys);
      }
    }
  }, [initialFavoriteKeys, queryClient]);

  const prevFavoritesRef = React.useRef<string>("");

  // Initialize localFavorites from initialFavoriteKeys or React Query cache
  // Only seed if data already exists (from SSR or previous query)
  const [localFavorites, setLocalFavorites] = React.useState<
    FavoriteKey[] | undefined
  >(() => {
    const cached = queryClient.getQueryData<FavoriteKey[]>(FAVORITES_QUERY_KEY);
    return cached ?? initialFavoriteKeys;
  });

  // Initialize ref after first render (cannot write refs during render)
  React.useEffect(() => {
    if (localFavorites) {
      prevFavoritesRef.current = JSON.stringify(localFavorites);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldFetchFavorites = React.useMemo(() => {
    if (authPending) return false;
    return Boolean(session) && hasSelection;
  }, [authPending, hasSelection, session]);

  const { data: favorites = [] } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: getFavorites,
    staleTime: Infinity,
    enabled: shouldFetchFavorites,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  React.useEffect(() => {
    if (Array.isArray(favorites)) {
      const favoritesArray = favorites as FavoriteKey[];
      const favoritesString = JSON.stringify(favoritesArray);
      if (prevFavoritesRef.current !== favoritesString) {
        setLocalFavorites(favoritesArray);
        prevFavoritesRef.current = favoritesString;
      }
    }
  }, [favorites]);

  React.useEffect(() => {
    if (authPending) return;
    if (!session) {
      prevFavoritesRef.current = "";
      setLocalFavorites(undefined);
      void queryClient.removeQueries({ queryKey: FAVORITES_QUERY_KEY });
    }
  }, [authPending, queryClient, session]);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return;
    }
    const bc = new BroadcastChannel(FAVORITES_BROADCAST_CHANNEL);
    bcRef.current = bc;
    const timeoutIds: NodeJS.Timeout[] = [];

    bc.onmessage = (event) => {
      if (
        event.data?.type === "updated" &&
        Array.isArray(event.data?.favorites)
      ) {
        if (event.data?.source === broadcastId) {
          return;
        }
        const newFavorites = event.data.favorites as FavoriteKey[];
        queryClient.setQueryData(FAVORITES_QUERY_KEY, newFavorites);
        setLocalFavorites(newFavorites);

        // Invalidate favorites rows query
        void queryClient.invalidateQueries({
          queryKey: ["favorites", "rows"],
          exact: false,
        });

        // Delay refetch to allow server cache invalidation to propagate
        const timeoutId = setTimeout(() => {
          void queryClient.refetchQueries({
            queryKey: ["favorites", "rows"],
            exact: false,
            type: "active",
          });
        }, 100);
        timeoutIds.push(timeoutId);
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
      timeoutIds.forEach(clearTimeout);
    };
  }, [broadcastId, queryClient]);

  const favoriteKeys = React.useMemo(() => {
    const list =
      localFavorites && localFavorites.length > 0
        ? localFavorites
        : initialFavoriteKeys || [];
    return new Set(list);
  }, [localFavorites, initialFavoriteKeys]);

  React.useEffect(() => {
    if (selectedRowCount < 2 && isCompareOpen) {
      setIsCompareOpen(false);
    }
  }, [selectedRowCount, isCompareOpen]);

  const handleCompareClick = React.useCallback(() => {
    if (selectedRowCount > 2) {
      setNoticeVariant("error");
      showFavoritesNotice("Error: You can only compare 2 GPUs");
      return;
    }

    if (selectedRowCount < 2) {
      setNoticeVariant("error");
      showFavoritesNotice("Select another GPU to compare");
      return;
    }

    setIsCompareOpen(true);
  }, [selectedRowCount, setIsCompareOpen, showFavoritesNotice]);

  const favoriteStatus = React.useMemo(() => {
    const selectedRowIds = Object.keys(checkedRows);
    const rowById = new Map(
      table
        .getRowModel()
        .flatRows.map((r) => [r.id, r.original as ColumnSchema]),
    );
    const selectedKeys = selectedRowIds
      .map((id) => rowById.get(id))
      .filter(Boolean)
      .map((row) => stableGpuKey(row as ColumnSchema));

    const alreadyFavorited = selectedKeys.filter((key) =>
      favoriteKeys.has(key),
    );
    const notFavorited = selectedKeys.filter((key) => !favoriteKeys.has(key));

    const shouldRemove =
      alreadyFavorited.length === selectedKeys.length &&
      selectedKeys.length > 0;
    const shouldAdd = notFavorited.length > 0;

    return {
      selectedCount: selectedKeys.length,
      alreadyFavorited: alreadyFavorited.length,
      notFavorited: notFavorited.length,
      toAdd: shouldAdd ? notFavorited : [],
      toRemove: shouldRemove ? alreadyFavorited : [],
      shouldRemove,
      shouldAdd,
    };
  }, [checkedRows, favoriteKeys, table]);

  const [isMutating, setIsMutating] = React.useState(false);

  const FAVORITES_CHUNK_SIZE = 200;
  const MAX_FAVORITES_PER_REQUEST = 50;

  const fetchFavoriteRowsByKeys = React.useCallback(
    async (keys: FavoriteKey[]) => {
      if (!keys.length) return [] as ColumnSchema[];

      const uniqueKeys = Array.from(new Set(keys));
      const rowsByKey = new Map<string, ColumnSchema>();

      for (
        let index = 0;
        index < uniqueKeys.length;
        index += FAVORITES_CHUNK_SIZE
      ) {
        const chunk = uniqueKeys.slice(index, index + FAVORITES_CHUNK_SIZE);
        const response = await fetch("/api/favorites/rows", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keys: chunk }),
        });

        if (!response.ok) {
          throw new Error("Failed to load favorite rows");
        }

        const json = (await response.json()) as { rows: ColumnSchema[] };
        for (const row of json.rows ?? []) {
          rowsByKey.set(row.uuid, row);
          rowsByKey.set(stableGpuKey(row), row);
        }
      }

      return keys
        .map((key) => rowsByKey.get(key))
        .filter((row): row is ColumnSchema => Boolean(row));
    },
    [],
  );

  const handleFavorite = async () => {
    if (!hasSelection) return;
    if (!session) {
      promptForAuth();
      return;
    }
    if (isMutating) return;

    const { toAdd, toRemove } = favoriteStatus;

    if (
      toAdd.length > MAX_FAVORITES_PER_REQUEST ||
      toRemove.length > MAX_FAVORITES_PER_REQUEST
    ) {
      setNoticeVariant("error");
      showFavoritesNotice(
        `Error: Max ${MAX_FAVORITES_PER_REQUEST} bookmarks per request`,
      );
      return;
    }
    setIsMutating(true);

    const snapshot =
      (queryClient.getQueryData(FAVORITES_QUERY_KEY) as
        | FavoriteKey[]
        | undefined) ??
      (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : undefined) ??
      (initialFavoriteKeys || []);
    const originalFavorites = [...snapshot];

    const current =
      localFavorites ??
      (Array.isArray(favorites) ? (favorites as FavoriteKey[]) : []) ??
      [];
    const shouldForceInvalidate = current.length === 0 && toAdd.length > 0;
    const hasFavoritesRowsCache =
      queryClient.getQueriesData({
        queryKey: ["favorites", "rows"],
        exact: false,
      }).length > 0;

    try {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
    } catch {}

    const optimisticFavorites = [
      ...current.filter((id) => !toRemove.includes(id as FavoriteKey)),
      ...toAdd,
    ];

    queryClient.setQueryData(FAVORITES_QUERY_KEY, optimisticFavorites);
    setLocalFavorites(optimisticFavorites);

    if (hasFavoritesRowsCache && toRemove.length > 0) {
      const removalSet = new Set(toRemove);
      // Update all favorites queries (with any search params) using partial key match
      queryClient.setQueriesData<
        | {
            pages: InfiniteQueryResponse<ColumnSchema[], LogsMeta>[];
            pageParams: unknown[];
          }
        | undefined
      >({ queryKey: ["favorites", "rows"], exact: false }, (previous) => {
        if (!previous || !previous.pages || previous.pages.length === 0) {
          return previous;
        }

        // Filter rows from all pages but keep page structure intact to preserve pagination
        const filteredPages = previous.pages.map((page) => {
          const filteredData = page.data.filter(
            (row) => !removalSet.has(stableGpuKey(row)),
          );
          return {
            ...page,
            data: filteredData,
            meta: {
              ...page.meta,
              totalRowCount: optimisticFavorites.length,
              filterRowCount: optimisticFavorites.length,
            },
            // Keep original cursors intact to preserve pagination
            // Only set nextCursor to null if this was the last page and we removed all remaining items
          };
        });

        // Only set nextCursor to null on the last page if all favorites are removed
        if (optimisticFavorites.length === 0) {
          const lastPage = filteredPages[filteredPages.length - 1];
          if (lastPage) {
            filteredPages[filteredPages.length - 1] = {
              ...lastPage,
              nextCursor: null,
            };
          }
        }

        return {
          ...previous,
          pages: filteredPages,
        };
      });
    }

    try {
      await Promise.all([
        toAdd.length > 0 ? addFavorites(toAdd) : Promise.resolve(),
        toRemove.length > 0 ? removeFavorites(toRemove) : Promise.resolve(),
      ]);

      if (hasFavoritesRowsCache && toAdd.length > 0) {
        try {
          const newRows = await fetchFavoriteRowsByKeys(toAdd as FavoriteKey[]);
          if (newRows.length) {
            // Update all favorites queries (with any search params) using partial key match
            queryClient.setQueriesData<
              | {
                  pages: InfiniteQueryResponse<ColumnSchema[], LogsMeta>[];
                  pageParams: unknown[];
                }
              | undefined
            >({ queryKey: ["favorites", "rows"], exact: false }, (previous) => {
              if (!previous || !previous.pages || previous.pages.length === 0) {
                return previous;
              }

              // Get existing rows from all pages
              const existingRows = previous.pages.flatMap(
                (page) => page.data ?? [],
              );
              const existingKeys = new Set(
                existingRows.map((row) => stableGpuKey(row)),
              );

              // Filter out duplicates and merge
              const rowsToAdd = newRows.filter(
                (row) => !existingKeys.has(stableGpuKey(row)),
              );
              if (rowsToAdd.length === 0) return previous;

              // Add to last page if there's space, otherwise create new page
              const lastPage = previous.pages[previous.pages.length - 1];
              const pageSize = lastPage?.data?.length ?? 50;

              if (
                lastPage &&
                lastPage.data.length + rowsToAdd.length <= pageSize
              ) {
                // Add to last page
                const updatedPages = [...previous.pages];
                updatedPages[updatedPages.length - 1] = {
                  ...lastPage,
                  data: [...lastPage.data, ...rowsToAdd],
                  meta: {
                    ...lastPage.meta,
                    totalRowCount: optimisticFavorites.length,
                    filterRowCount: optimisticFavorites.length,
                  },
                };
                return {
                  ...previous,
                  pages: updatedPages,
                };
              } else {
                // Create new page
                const newPage: InfiniteQueryResponse<ColumnSchema[], LogsMeta> =
                  {
                    data: rowsToAdd,
                    meta: {
                      totalRowCount: optimisticFavorites.length,
                      filterRowCount: optimisticFavorites.length,
                      facets: {},
                    },
                    prevCursor: lastPage?.nextCursor ?? null,
                    nextCursor: null,
                  };
                return {
                  ...previous,
                  pages: [...previous.pages, newPage],
                  pageParams: [
                    ...(previous.pageParams ?? []),
                    { cursor: lastPage?.nextCursor ?? null, size: 50 },
                  ],
                };
              }
            });
          }
        } catch (error) {
          console.warn("[gpu favorites] failed to append rows after mutation", {
            error: error instanceof Error ? error.message : String(error),
          });
          void queryClient.invalidateQueries({
            queryKey: ["favorites", "rows"],
            exact: false,
          });
        }
      }
      if (shouldForceInvalidate) {
        void queryClient.invalidateQueries({
          queryKey: ["favorites", "rows"],
          exact: false,
        });
      }
      // Broadcast to other tabs (they will handle delayed refetch)
      try {
        bcRef.current?.postMessage({
          type: "updated",
          favorites: optimisticFavorites,
          source: broadcastId,
        });
      } catch {}

      if (isMountedRef.current) {
        setIsMutating(false);
      }

      setNoticeVariant("success");
      if (toAdd.length > 0) {
        showFavoritesNotice("Added to bookmarks");
      } else if (toRemove.length > 0) {
        showFavoritesNotice("Removed from bookmarks");
      }
    } catch (error) {
      logger.warn("[gpu favorites] mutation failed", {
        toAddCount: toAdd.length,
        toRemoveCount: toRemove.length,
        error: error instanceof Error ? error.message : String(error),
      });

      queryClient.setQueryData(FAVORITES_QUERY_KEY, originalFavorites);
      setLocalFavorites(originalFavorites);
      void queryClient.invalidateQueries({
        queryKey: ["favorites", "rows"],
        exact: false,
      });

      if (isMountedRef.current) {
        setIsMutating(false);
        setNoticeVariant("error");
        if (error instanceof FavoritesAPIError) {
          if (error.status === 401) {
            promptForAuth();
            return;
          }

          if (error.status === 429) {
            showFavoritesNotice("Rate limit exceeded. Try again later");
            return;
          }

          if (error.status === 400) {
            showFavoritesNotice(
              `Error: Max ${MAX_FAVORITES_PER_REQUEST} bookmarks per request`,
            );
            return;
          }

          if (error.code === "TIMEOUT") {
            showFavoritesNotice("Server took too long. Please try again.");
            return;
          }

          showFavoritesNotice(error.message);
        } else {
          showFavoritesNotice("Failed to update bookmarks");
        }
      }
    }
  };

  if (!hasSelection) return null;

  const content = (
    <div
      className="pointer-events-none fixed inset-x-0 flex items-center justify-center px-4"
      style={{ bottom: `calc(24px + env(safe-area-inset-bottom))` }}
      aria-live="polite"
      role="region"
      aria-label="Selection actions"
    >
      <FavoritesNotice
        message={favoritesNotice}
        open={isFavoritesOpen}
        variant={noticeVariant}
      />
      <div
        className={cn(
          "pointer-events-auto z-[var(--z-island)] flex w-auto items-center gap-2 rounded-md border border-border bg-background p-2 shadow-md transition-all duration-200 motion-reduce:transition-none",
        )}
      >
        <Button
          size="sm"
          variant="secondary"
          className="group gap-2 bg-muted text-foreground"
          aria-label="Compare selected"
          onClick={handleCompareClick}
        >
          <GitCompare className="h-4 w-4 text-foreground transition-colors group-hover:text-[hsl(var(--signal))]" />
          <span>Compare</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="group gap-2 bg-muted text-foreground"
          onClick={handleFavorite}
          disabled={isMutating}
          aria-label="Toggle bookmark status"
        >
          <Bookmark
            className={cn(
              "h-4 w-4 fill-transparent text-foreground transition-colors",
              favoriteStatus.shouldRemove
                ? "fill-[hsl(var(--chart-3))] text-[hsl(var(--chart-3))]"
                : "group-hover:text-[hsl(var(--chart-3))]",
            )}
          />
          <span>{favoriteStatus.shouldRemove ? "Bookmarked" : "Bookmark"}</span>
        </Button>
      </div>
    </div>
  );

  const island =
    typeof document === "undefined"
      ? content
      : createPortal(content, document.body);

  return (
    <>
      <CompareDialog
        open={isCompareOpen}
        onOpenChange={setIsCompareOpen}
        rows={compareRows}
        table={table}
      />
      {island}
    </>
  );
}
