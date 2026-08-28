import type { HomepageResearchManifest } from "./types.ts";

export function createHomepageResearchManifest(
  gpu: HomepageResearchManifest["gpu"],
  llm: HomepageResearchManifest["llm"],
): HomepageResearchManifest {
  return { gpu, llm };
}

export function formatResearchTotal(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}
