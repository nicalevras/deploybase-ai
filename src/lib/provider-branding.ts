const PROVIDER_COLORS: Record<string, string> = {
  ai21: "#5B5BD6",
  alibaba: "#FF6A00",
  alibabacloud: "#FF6A00",
  amd: "#ED1C24",
  amazon: "#FF9900",
  amazonbedrock: "#FF9900",
  anthropic: "#D97757",
  atlascloud: "#2563EB",
  aws: "#FF9900",
  azure: "#0078D4",
  baseten: "#7C3AED",
  cerebras: "#F97316",
  chutes: "#EC4899",
  civo: "#239DCE",
  cloudflare: "#F48120",
  cohere: "#39594D",
  coreweave: "#00A77F",
  crusoe: "#2DB67C",
  deepinfra: "#5B6DEF",
  deepseek: "#4D6BFE",
  digitalocean: "#0080FF",
  fireworks: "#7C3AED",
  google: "#4285F4",
  googleaistudio: "#4285F4",
  googlecloud: "#4285F4",
  googlevertex: "#4285F4",
  groq: "#F55036",
  hyperbolic: "#7C3AED",
  hyperstack: "#6D4AFF",
  koyeb: "#7856FF",
  lambda: "#FF4F64",
  latitude: "#2563EB",
  latitudesh: "#2563EB",
  minimax: "#F43F5E",
  mistral: "#FF7000",
  mistralai: "#FF7000",
  moonshot: "#111827",
  moonshotai: "#111827",
  nebius: "#B7F34A",
  novita: "#8B5CF6",
  nvidia: "#76B900",
  openai: "#10A37F",
  oracle: "#C74634",
  paperspace: "#623CEA",
  perplexity: "#20B8A6",
  replicate: "#171717",
  runpod: "#6D4AFF",
  scaleway: "#4F0599",
  sesterce: "#E11D74",
  siliconflow: "#0EA5E9",
  thundercompute: "#0891B2",
  together: "#FF4D00",
  togetherai: "#FF4D00",
  vast: "#0F766E",
  vastai: "#0F766E",
  verda: "#16A34A",
  voltagepark: "#FF5C35",
  xai: "#171717",
  xiaomi: "#FF6900",
  zai: "#2563EB",
};

const FALLBACK_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#0891B2",
  "#059669",
  "#4F46E5",
  "#C026D3",
];

export function normalizeProviderKey(provider?: string | null) {
  return (provider ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getProviderColor(provider?: string | null) {
  const key = normalizeProviderKey(provider);
  const mapped = PROVIDER_COLORS[key];
  if (mapped) return mapped;

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}
