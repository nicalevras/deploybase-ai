export type SearchResultKind = "gpu" | "llm" | "tool" | "article";

export interface HeaderSearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  description: string;
  href: string;
  provider?: string;
  model?: string;
  author?: string;
}

export interface HeaderSearchSection {
  label: string;
  total: number;
  viewAllHref: string;
  results: HeaderSearchResult[];
}

export interface FederatedSearchResponse {
  query: string;
  sections: {
    gpus: HeaderSearchSection;
    llms: HeaderSearchSection;
    tools: HeaderSearchSection;
    articles: HeaderSearchSection;
  };
}
