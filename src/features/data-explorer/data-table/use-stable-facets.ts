"use client";

import * as React from "react";

export function useStableFacets<T extends Record<string, unknown>>(
  facets: T | undefined,
): T {
  const [previousFacets, setPreviousFacets] = React.useState(facets);
  const [stableFacets, setStableFacets] = React.useState<T>(
    facets ?? ({} as T),
  );

  if (facets !== previousFacets) {
    setPreviousFacets(facets);
    if (facets && Object.keys(facets).length > 0) {
      setStableFacets(facets);
      return facets;
    }
  }

  return facets && Object.keys(facets).length > 0 ? facets : stableFacets;
}
