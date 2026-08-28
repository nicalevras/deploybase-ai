export function toIsoTimestamp(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function newestIsoTimestamp(
  values: Array<Date | string | null | undefined>,
): string | null {
  let newest: Date | null = null;

  for (const value of values) {
    const normalized = toIsoTimestamp(value);
    if (!normalized) continue;
    const date = new Date(normalized);
    if (!newest || date > newest) newest = date;
  }

  return newest?.toISOString() ?? null;
}
