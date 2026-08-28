"use client";

import {
  getModelLogo,
  getModelProviderLogo,
} from "@/features/data-explorer/models/model-provider-logos";
import { getGpuProviderLogo } from "@/features/data-explorer/table/provider-logos";
import { getProviderColor } from "@/lib/provider-branding";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ProviderDomain = "gpu" | "llm";

export function ProviderMark({
  provider,
  domain,
  size = 20,
  className,
}: {
  provider: string;
  domain: ProviderDomain;
  size?: number;
  className?: string;
}) {
  const logo =
    domain === "gpu"
      ? getGpuProviderLogo(provider)
      : getModelProviderLogo(provider);

  if (logo?.type === "icon") {
    return (
      <logo.Avatar
        size={size}
        shape="circle"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logo?.type === "image" ? (
        <Image
          src={logo.src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain p-px"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[9px] font-bold text-white"
          style={{ backgroundColor: getProviderColor(provider) }}
        >
          {provider.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function ModelMark({
  model,
  author,
  size = 24,
  className,
}: {
  model: string;
  author: string;
  size?: number;
  className?: string;
}) {
  const logo = getModelLogo(model, author);

  if (logo?.type === "icon") {
    return (
      <logo.Avatar
        size={size}
        shape="circle"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logo?.type === "image" ? (
        <Image
          src={logo.src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain p-px"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[9px] font-bold text-white"
          style={{ backgroundColor: getProviderColor(author) }}
        >
          {(model || author).charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function GpuModelMark({
  model,
  size = 20,
  className,
}: {
  model: string;
  size?: number;
  className?: string;
}) {
  const key = model.toLowerCase();
  const brand = key.includes("nvidia")
    ? { name: "NVIDIA", src: "/logos/nvidia.png" }
    : key.includes("amd") || key.includes("radeon")
      ? { name: "AMD", src: "/logos/amd.png" }
      : null;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {brand ? (
        <Image
          src={brand.src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain p-px"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[9px] font-bold text-white"
          style={{ backgroundColor: getProviderColor(model) }}
        >
          {model.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
