export const FEATURED_MODELS = "featured-models";
// A permanent lower bound: dated models released after this point remain
// eligible, including models released after the current deployment.
export const FEATURED_RELEASE_START = Date.parse(
  "2026-05-25T00:00:00.000Z",
);

export const FEATURED_LLM_PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "DeepSeek",
  "MoonshotAI",
  "Perplexity",
  "SpaceXAI",
  "Meta",
  "Xiaomi",
  "Z.ai",
  "MiniMax",
  "Google AI Studio",
] as const;

export const featuredLlmProviderSet = new Set<string>(
  FEATURED_LLM_PROVIDERS,
);

export const featuredLlmPermaslugSet = new Set([
  "anthropic/claude-4.8-opus-20260528",
  "anthropic/claude-4.8-opus-fast-20260528",
  "~anthropic/claude-fable-latest",
  "anthropic/claude-sonnet-5-20260630",
  "anthropic/claude-opus-5-20260723",
  "anthropic/claude-opus-5-fast-20260723",
  "openai/gpt-5.6-luna-20260709",
  "openai/gpt-5.6-luna-pro-20260709",
  "openai/gpt-5.6-sol-20260709",
  "openai/gpt-5.6-sol-pro-20260709",
  "openai/gpt-5.6-terra-20260709",
  "openai/gpt-5.6-terra-pro-20260709",
  "deepseek/deepseek-v4-pro-20260813",
  "deepseek/deepseek-v4-flash-vision-exp-20260821",
  "~deepseek/deepseek-v4-flash-latest",
  "moonshotai/kimi-k2.7-code-20260612",
  "moonshotai/kimi-k3-20260715",
  "x-ai/grok-4.5-20260708",
  "x-ai/grok-4.6-20260810",
  "meta/muse-spark-1.1-20260709",
  "meta/muse-spark-1.2-20260805",
  "meta/muse-spark-1.2-contributor-20260805",
  "z-ai/glm-5.2-20260616",
  "~z-ai/glm-latest",
  "minimax/minimax-m3-20260531",
  "google/gemini-3.5-flash-lite-20260721",
  "google/gemini-3.6-flash-20260721",
  "google/gemini-3.7-flash-20260813",
]);
