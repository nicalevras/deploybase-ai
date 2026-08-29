export interface ProviderRouteResolution {
  value: string;
  segment: string;
  isCanonical: boolean;
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function resolveProviderFromValues(
  segment: string,
  values: string[],
  domain: "gpu" | "llm",
): ProviderRouteResolution | null {
  const decoded = decodeRouteSegment(segment).trim();
  const match = values.find(
    (value) => value.toLowerCase() === decoded.toLowerCase(),
  );
  if (!match) return null;

  const canonicalValue = domain === "gpu" ? match.toLowerCase().trim() : match;
  return {
    value: canonicalValue,
    segment: encodeURIComponent(canonicalValue),
    isCanonical: decoded === canonicalValue,
  };
}
