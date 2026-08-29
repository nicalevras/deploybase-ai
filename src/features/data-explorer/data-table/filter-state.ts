interface ColumnFilterLike {
  id: string;
  value: unknown;
}

export function isColumnFilterParameter(key: string) {
  return key !== "bookmarks" && key !== "uuid";
}

export function getExternalFilterSignature(
  filters: ColumnFilterLike[],
  id: string,
) {
  return JSON.stringify(
    filters.find((filter) => filter.id === id)?.value ?? null,
  );
}
