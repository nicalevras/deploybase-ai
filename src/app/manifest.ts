import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deploybase",
    short_name: "Deploybase",
    description: "Compare GPU cloud and LLM API pricing across all providers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4ef",
    theme_color: "#f5f4ef",
    icons: [
      {
        src: "/assets/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
