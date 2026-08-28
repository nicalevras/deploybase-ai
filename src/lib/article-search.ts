export function normalizeArticleSearchText(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}
