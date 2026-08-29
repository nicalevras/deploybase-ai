import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { AppHeader } from "@/components/site/app-header-shell";
import { getOAuthAvailability } from "@/lib/auth-configuration";
import { OG_IMAGE, OG_SITE_NAME } from "@/lib/og";
import { AuthDialogParamsSync } from "@/providers/auth-dialog-params-sync";
import { AuthDialogProvider } from "@/providers/auth-dialog-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ReactQueryProvider } from "@/providers/react-query";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import PlausibleProvider from "next-plausible";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Satoshi-Black.woff2", weight: "900", style: "normal" },
    { path: "./fonts/Satoshi-Italic.woff2", weight: "400", style: "italic" },
    {
      path: "./fonts/Satoshi-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-satoshi",
});

const TITLE = "Compare GPU & LLM API Pricing | Deploybase";
const DESCRIPTION =
  "Compare GPU cloud and LLM API pricing across all providers. Performance stats, pricing history, and side-by-side comparisons.";

const DEFAULT_SITE_URL = "https://deploybase.ai";

function resolveMetadataBase() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!envUrl) {
    return new URL(DEFAULT_SITE_URL);
  }

  try {
    const normalized = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    return new URL(normalized);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: TITLE,
  description: DESCRIPTION,
  // Disable iOS Safari data detectors (smart links) to avoid dotted underlines
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  twitter: {
    images: [OG_IMAGE],
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  openGraph: {
    type: "website",
    siteName: OG_SITE_NAME,
    images: [OG_IMAGE],
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const oauthProviders = getOAuthAvailability();
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <PlausibleProvider domain="deploybase.ai" trackOutboundLinks />
      </head>
      <body className="min-h-[100dvh] overscroll-x-none bg-background antialiased">
        <AuthProvider>
          <ReactQueryProvider>
            <NuqsAdapter>
              <AuthDialogProvider oauthProviders={oauthProviders}>
                <AppHeader />
                <main
                  id="content"
                  className="flex min-h-[calc(100dvh-var(--app-header-height))] flex-col"
                >
                  {children}
                </main>
                <Suspense fallback={null}>
                  <AuthDialogParamsSync />
                </Suspense>
              </AuthDialogProvider>
            </NuqsAdapter>
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
