import {
  Ai21,
  AionLabs,
  AiStudio,
  AlibabaCloud,
  Anthropic,
  Arcee,
  AtlasCloud,
  Aya,
  Azure,
  Baseten,
  Bedrock,
  Bfl,
  ByteDance,
  Cerebras,
  // Model-family icons
  Claude,
  Cloudflare,
  Cohere,
  Crusoe,
  Dbrx,
  DeepInfra,
  DeepSeek,
  Featherless,
  Fireworks,
  Friendli,
  Gemini,
  Gemma,
  Google,
  Grok,
  Groq,
  Hyperbolic,
  Inception,
  Infermatic,
  Inflection,
  Liquid,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  Morph,
  Nebius,
  Nova,
  Novita,
  Nvidia,
  OpenAI,
  Parasail,
  Perplexity,
  Qwen,
  Relace,
  SambaNova,
  SiliconCloud,
  Stepfun,
  StreamLake,
  Targon,
  Together,
  Upstage,
  VertexAI,
  XAI,
  XiaomiMiMo,
  Yi,
  ZAI,
} from "@lobehub/icons";
import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Lobe icon mapping — Avatar variant (brand bg + colored icon, self-contained)
// Accepts `size` and `shape` props
// ---------------------------------------------------------------------------
type LobeAvatar = ComponentType<{
  size: number;
  shape?: "circle" | "square";
  className?: string;
}>;

const LOBE_ICON_MAP: Record<string, LobeAvatar> = {
  ai21: Ai21.Avatar,
  "google ai studio": AiStudio.Avatar,
  aionlabs: AionLabs.Avatar,
  "alibaba cloud": AlibabaCloud.Avatar,
  anthropic: Anthropic.Avatar,
  "arcee ai": Arcee.Avatar,
  atlascloud: AtlasCloud.Avatar,
  azure: Azure.Avatar,
  baseten: Baseten.Avatar,
  "amazon bedrock": Bedrock.Avatar,
  "black forest labs": Bfl.Avatar,
  seed: ByteDance.Avatar, // Seed is ByteDance's AI platform
  cerebras: Cerebras.Avatar,
  cloudflare: Cloudflare.Avatar,
  cohere: Cohere.Avatar,
  crusoe: Crusoe.Avatar,
  deepinfra: DeepInfra.Avatar,
  deepseek: DeepSeek.Avatar,
  featherless: Featherless.Avatar,
  fireworks: Fireworks.Avatar,
  friendli: Friendli.Avatar,
  google: Google.Avatar,
  groq: Groq.Avatar,
  hyperbolic: Hyperbolic.Avatar,
  inception: Inception.Avatar,
  infermatic: Infermatic.Avatar,
  inflection: Inflection.Avatar,
  liquid: Liquid.Avatar,
  meta: Meta.Avatar,
  minimax: Minimax.Avatar,
  mistral: Mistral.Avatar,
  moonshotai: Moonshot.Avatar,
  morph: Morph.Avatar,
  nebius: Nebius.Avatar,
  "amazon nova": Nova.Avatar,
  novita: Novita.Avatar,
  nvidia: Nvidia.Avatar,
  openai: OpenAI.Avatar,
  parasail: Parasail.Avatar,
  perplexity: Perplexity.Avatar,
  qwen: Qwen.Avatar,
  relace: Relace.Avatar,
  sambanova: SambaNova.Avatar,
  siliconflow: SiliconCloud.Avatar,
  stepfun: Stepfun.Avatar,
  streamlake: StreamLake.Avatar,
  targon: Targon.Avatar,
  together: Together.Avatar,
  upstage: Upstage.Avatar,
  "google vertex": VertexAI.Avatar,
  xai: XAI.Avatar,
  "z.ai": ZAI.Avatar,
  xiaomi: XiaomiMiMo.Avatar,
};

// ---------------------------------------------------------------------------
// Image fallback mapping — used when lobe icon doesn't exist for a provider
// ---------------------------------------------------------------------------
const MODEL_PROVIDER_LOGOS: Record<
  string,
  {
    src: string;
    alt: string;
  }
> = {
  anthropic: { src: "/logos/Anthropic.svg", alt: "Anthropic" },
  "alibaba cloud": { src: "/logos/alibaba.png", alt: "Alibaba Cloud" },
  "amazon bedrock": { src: "/logos/Bedrock.svg", alt: "Amazon Bedrock" },
  ai21: { src: "/logos/ai21.png", alt: "AI21" },
  aionlabs: { src: "/logos/aionlabs.png", alt: "AionLabs" },
  atlascloud: { src: "/logos/atlascloud.png", alt: "AtlasCloud" },
  azure: { src: "/logos/Azure.svg", alt: "Azure" },
  baseten: { src: "/logos/baseten.svg", alt: "BaseTen" },
  cerebras: { src: "/logos/cerebras.png", alt: "Cerebras" },
  chutes: { src: "/logos/chutes.png", alt: "Chutes" },
  cohere: { src: "/logos/Cohere.png", alt: "Cohere" },
  cloudflare: { src: "/logos/cloudflare.png", alt: "Cloudflare" },
  crusoe: { src: "/logos/crusoe.png", alt: "Crusoe" },
  deepseek: { src: "/logos/DeepSeek.png", alt: "DeepSeek" },
  deepinfra: { src: "/logos/deepinfra.png", alt: "DeepInfra" },
  featherless: { src: "/logos/featherless.svg", alt: "Featherless" },
  fireworks: { src: "/logos/Fireworks.png", alt: "Fireworks" },
  friendli: { src: "/logos/friendli.png", alt: "Friendli" },
  gmicloud: { src: "/logos/gmicloud.png", alt: "GMICloud" },
  "google ai studio": {
    src: "/logos/GoogleAIStudio.png",
    alt: "Google AI Studio",
  },
  groq: { src: "/logos/groq.png", alt: "Groq" },
  "z.ai": { src: "/logos/zai.png", alt: "Z.AI" },
  xai: { src: "/logos/xai.png", alt: "xAI" },
  together: { src: "/logos/together.svg", alt: "Together" },
  perplexity: { src: "/logos/Perplexity.svg", alt: "Perplexity" },
  "weights and biases": { src: "/logos/wandb.png", alt: "Weights and Biases" },
  "google vertex": { src: "/logos/GoogleVertex.png", alt: "Google Vertex" },
  hyperbolic: { src: "/logos/hyperbolic.png", alt: "Hyperbolic" },
  meta: { src: "/logos/meta.png", alt: "Meta" },
  mistral: { src: "/logos/Mistral.png", alt: "Mistral" },
  inception: { src: "/logos/inception.png", alt: "Inception" },
  openai: { src: "/logos/openai.png", alt: "OpenAI" },
  nebius: { src: "/logos/nebius.png", alt: "Nebius" },
  novita: { src: "/logos/novita.jpeg", alt: "Novita" },
  inferencenet: { src: "/logos/inferencenet.png", alt: "InferenceNet" },
  nvidia: { src: "/logos/nvidia.png", alt: "NVIDIA" },
  infermatic: { src: "/logos/infermatic.png", alt: "Infermatic" },
  inflection: { src: "/logos/inflection.png", alt: "Inflection" },
  liquid: { src: "/logos/liquid.png", alt: "Liquid" },
  mancer: { src: "/logos/mancer.svg", alt: "Mancer" },
  minimax: { src: "/logos/minimax.png", alt: "MiniMax" },
  openinference: { src: "/logos/openinference.png", alt: "OpenInference" },
  parasail: { src: "/logos/parasail.png", alt: "Parasail" },
  phala: { src: "/logos/phala.png", alt: "Phala" },
  moonshotai: { src: "/logos/moonshot.png", alt: "Moonshot AI" },
  ncompass: { src: "/logos/ncompass.png", alt: "nCompass" },
  morph: { src: "/logos/morph.png", alt: "Morph" },
  nextbit: { src: "/logos/nextbit.png", alt: "NextBit" },
  relace: { src: "/logos/relace.png", alt: "Relace" },
  sambanova: { src: "/logos/sambanova.png", alt: "SambaNova" },
  siliconflow: { src: "/logos/siliconflow.png", alt: "SiliconFlow" },
  switchpoint: { src: "/logos/switchpoint.png", alt: "Switchpoint" },
  targon: { src: "/logos/targon.svg", alt: "Targon" },
  venice: { src: "/logos/venice.png", alt: "Venice" },
  qwen: { src: "/logos/Qwen.png", alt: "Qwen" },
  google: { src: "/logos/google.svg", alt: "Google" },
  cirrascale: { src: "/logos/cirrascale.png", alt: "Cirrascale" },
  clarifai: { src: "/logos/clarifai.png", alt: "Clarifai" },
  inceptron: { src: "/logos/inceptron.svg", alt: "Inceptron" },
  sourceful: { src: "/logos/sourceful.ico", alt: "Sourceful" },
};

const MODEL_PROVIDER_ALIASES: Record<string, string> = {
  amazon: "amazon bedrock",
  amazonbedrock: "amazon bedrock",
  amazonwebservices: "amazon bedrock",
  googleaistudio: "google ai studio",
  googlevertex: "google vertex",
  metalama: "meta",
  mistralai: "mistral",
  moonshot: "moonshotai",
  nvidiacorporation: "nvidia",
  togetherai: "together",
  xiaomimimo: "xiaomi",
  zai: "z.ai",
};

function resolveModelProviderKey(provider: string) {
  const key = provider.toLowerCase().trim();
  const collapsed = key.replace(/[^a-z0-9]/g, "");
  return MODEL_PROVIDER_ALIASES[collapsed] ?? key;
}

// ---------------------------------------------------------------------------
// Unified logo result — consumers check `type` to decide how to render
// ---------------------------------------------------------------------------
export type LogoResult =
  | { type: "icon"; Avatar: LobeAvatar; alt: string }
  | { type: "image"; src: string; alt: string }
  | null;

/**
 * Resolve a model provider's logo — prefers lobe Avatar icon, falls back to image.
 */
export function getModelProviderLogo(provider?: string | null): LogoResult {
  if (!provider) return null;
  const key = resolveModelProviderKey(provider);

  // 1. Try lobe Avatar first
  const Avatar = LOBE_ICON_MAP[key];
  if (Avatar) {
    const entry = MODEL_PROVIDER_LOGOS[key];
    return { type: "icon", Avatar, alt: entry?.alt ?? provider };
  }

  // 2. Fall back to image
  const entry = MODEL_PROVIDER_LOGOS[key];
  if (entry?.src) {
    return { type: "image", src: entry.src, alt: entry.alt };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Model-family icons — used in sheet detail view to show model-specific icon
// (e.g., Claude icon instead of Anthropic, Gemini instead of Google)
// Falls back to author/provider logo when no family match
// ---------------------------------------------------------------------------
const MODEL_FAMILY_MAP: { keyword: string; Avatar: LobeAvatar; alt: string }[] =
  [
    { keyword: "claude", Avatar: Claude.Avatar, alt: "Claude" },
    { keyword: "gemini", Avatar: Gemini.Avatar, alt: "Gemini" },
    { keyword: "gemma", Avatar: Gemma.Avatar, alt: "Gemma" },
    { keyword: "grok", Avatar: Grok.Avatar, alt: "Grok" },
    { keyword: "yi-", Avatar: Yi.Avatar, alt: "Yi" },
    { keyword: "aya", Avatar: Aya.Avatar, alt: "Aya" },
    { keyword: "dbrx", Avatar: Dbrx.Avatar, alt: "DBRX" },
  ];

/**
 * Resolve a model's icon for the sheet detail view.
 * Checks model name/slug for known families first, falls back to author logo.
 */
export function getModelLogo(
  modelName?: string | null,
  author?: string | null,
): LogoResult {
  if (modelName) {
    const lower = modelName.toLowerCase();
    for (const family of MODEL_FAMILY_MAP) {
      if (lower.includes(family.keyword)) {
        return { type: "icon", Avatar: family.Avatar, alt: family.alt };
      }
    }
  }
  // Fall back to author/provider logo
  return getModelProviderLogo(author);
}
