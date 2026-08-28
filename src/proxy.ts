import {
  getLegacyArticleSearchRedirect,
  getLegacyGpuRedirectFromSearchParams,
} from "@/lib/research/legacy-query";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.upstash.io https://openrouter.ai https://formspree.io",
  "frame-ancestors 'none'",
].join("; ");

export function proxy(request: NextRequest) {
  const legacyArticleSearch = getLegacyArticleSearchRedirect(
    request.nextUrl.pathname,
    request.nextUrl.searchParams,
  );
  const legacyRedirect =
    request.nextUrl.pathname === "/"
      ? getLegacyGpuRedirectFromSearchParams(request.nextUrl.searchParams)
      : null;
  const response = legacyArticleSearch
    ? NextResponse.redirect(new URL(legacyArticleSearch, request.url), 308)
    : legacyRedirect
      ? NextResponse.redirect(new URL(legacyRedirect, request.url))
      : NextResponse.next();

  // Security headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // X-XSS-Protection: 0 disables the legacy XSS auditor which can
  // introduce vulnerabilities. Modern CSP replaces it.
  response.headers.set("X-XSS-Protection", "0");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
