export function buildResearchSelectionUrl(
  endpoint: string,
  parameter: string,
  key: string,
) {
  return `${endpoint}?${parameter}=${encodeURIComponent(key)}`;
}

export async function fetchResearchSelection<TPayload>(
  fetcher: typeof fetch,
  endpoint: string,
  parameter: string,
  key: string,
  signal?: AbortSignal,
): Promise<TPayload> {
  const response = await fetcher(
    buildResearchSelectionUrl(endpoint, parameter, key),
    { signal },
  );
  if (!response.ok) throw new Error("Research data is unavailable.");
  return (await response.json()) as TPayload;
}
