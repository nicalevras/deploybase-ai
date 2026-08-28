const GPU_QUERY_KEYS = new Set([
  "provider",
  "type",
  "gpu_model",
  "vram_gb",
  "price_hour_usd",
  "observed_at",
  "search",
  "bookmarks",
  "sort",
  "size",
  "cursor",
  "uuid",
]);

export type LegacySearchParams = Record<string, string | string[] | undefined>;

export function getLegacyGpuRedirect(input: LegacySearchParams): string | null {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  return getLegacyGpuRedirectFromSearchParams(params);
}

export function getLegacyGpuRedirectFromSearchParams(
  params: URLSearchParams,
): string | null {
  if (![...params.keys()].some((key) => GPU_QUERY_KEYS.has(key))) return null;

  const query = params.toString();
  return query ? `/gpus?${query}` : "/gpus";
}

export function getLegacyArticleSearchRedirect(
  pathname: string,
  params: URLSearchParams,
): string | null {
  if (pathname !== "/articles" || !params.has("search")) return null;
  const query = params.toString();
  return query ? `/articles/search?${query}` : "/articles/search";
}
