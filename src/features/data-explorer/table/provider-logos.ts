import {
  AlibabaCloud,
  Aws,
  Azure,
  Crusoe,
  GoogleCloud,
  Lambda,
  Nebius,
  Replicate,
  Together,
} from "@lobehub/icons";
import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Lobe Avatar mapping for GPU providers (brand bg + icon, self-contained)
// ---------------------------------------------------------------------------
type LobeAvatar = ComponentType<{
  size: number;
  shape?: "circle" | "square";
  className?: string;
}>;

const GPU_LOBE_ICON_MAP: Record<string, LobeAvatar> = {
  nebius: Nebius.Avatar,
  lambda: Lambda.Avatar,
  crusoe: Crusoe.Avatar,
  googlecloud: GoogleCloud.Avatar,
  replicate: Replicate.Avatar,
  aws: Aws.Avatar,
  azure: Azure.Avatar,
  alibaba: AlibabaCloud.Avatar,
  togetherai: Together.Avatar,
};

// ---------------------------------------------------------------------------
// Image fallback mapping
// ---------------------------------------------------------------------------
const PROVIDER_LOGOS: Record<string, { src: string; alt: string }> = {
  coreweave: { src: "/logos/coreweave.png", alt: "CoreWeave" },
  nebius: { src: "/logos/nebius.png", alt: "Nebius" },
  hyperstack: { src: "/logos/hyperstack.png", alt: "Hyperstack" },
  runpod: { src: "/logos/runpod.png", alt: "RunPod" },
  lambda: { src: "/logos/lambda.png", alt: "Lambda" },
  digitalocean: { src: "/logos/digitalocean.png", alt: "DigitalOcean" },
  oracle: { src: "/logos/oracle.png", alt: "Oracle" },
  crusoe: { src: "/logos/crusoe.png", alt: "Crusoe" },
  flyio: { src: "/logos/flyio.png", alt: "Fly.io" },
  vultr: { src: "/logos/vultr.png", alt: "Vultr" },
  latitude: { src: "/logos/latitude.png", alt: "Latitude.sh" },
  ori: { src: "/logos/ori.png", alt: "Ori" },
  voltagepark: { src: "/logos/voltagepark.png", alt: "Voltage Park" },
  googlecloud: { src: "/logos/googlecloud.png", alt: "Google Cloud" },
  verda: { src: "/logos/verda.png", alt: "Verda" },
  scaleway: { src: "/logos/scaleway.png", alt: "Scaleway" },
  replicate: { src: "/logos/replicate.jpeg", alt: "Replicate" },
  thundercompute: { src: "/logos/thundercompute.png", alt: "Thunder Compute" },
  koyeb: { src: "/logos/koyeb.png", alt: "Koyeb" },
  sesterce: { src: "/logos/sesterce.png", alt: "Sesterce" },
  aws: { src: "/logos/aws.png", alt: "AWS" },
  azure: { src: "/logos/Azure.svg", alt: "Azure" },
  civo: { src: "/logos/civo.png", alt: "Civo" },
  vast: { src: "/logos/vast.png", alt: "Vast.ai" },
  hotaisle: { src: "/logos/hotaisle.jpeg", alt: "HotAisle" },
  alibaba: { src: "/logos/alibaba.png", alt: "Alibaba Cloud" },
  oblivus: { src: "/logos/oblivus.png", alt: "Oblivus" },
  paperspace: { src: "/logos/paperspace.png", alt: "Paperspace" },
  togetherai: { src: "/logos/together.svg", alt: "Together AI" },
};

const GPU_PROVIDER_ALIASES: Record<string, string> = {
  alibabacloud: "alibaba",
  amazonwebservices: "aws",
  google: "googlecloud",
  latitudesh: "latitude",
  together: "togetherai",
  vastai: "vast",
  voltageparkinc: "voltagepark",
};

function resolveGpuProviderKey(provider: string) {
  const collapsed = provider
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
  return GPU_PROVIDER_ALIASES[collapsed] ?? collapsed;
}

// ---------------------------------------------------------------------------
// Unified logo result
// ---------------------------------------------------------------------------
export type GpuLogoResult =
  | { type: "icon"; Avatar: LobeAvatar; alt: string }
  | { type: "image"; src: string; alt: string }
  | null;

export function getGpuProviderLogo(provider?: string | null): GpuLogoResult {
  if (!provider) return null;
  const key = resolveGpuProviderKey(provider);

  // 1. Try lobe Avatar first
  const Avatar = GPU_LOBE_ICON_MAP[key];
  if (Avatar) {
    const entry = PROVIDER_LOGOS[key];
    return { type: "icon", Avatar, alt: entry?.alt ?? provider };
  }

  // 2. Fall back to image
  const entry = PROVIDER_LOGOS[key];
  if (entry?.src) {
    return { type: "image", src: entry.src, alt: entry.alt };
  }

  return null;
}

// Get display name from PROVIDER_LOGOS.alt (single source of truth)
export function getProviderDisplayName(provider?: string | null): string {
  if (!provider) return "Unknown";
  const key = resolveGpuProviderKey(provider);
  const logo = PROVIDER_LOGOS[key];
  if (logo) return logo.alt;
  // Fallback: capitalize first letter
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
