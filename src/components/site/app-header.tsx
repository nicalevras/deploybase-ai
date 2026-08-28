"use client";

import {
  HeaderSearch,
  HeaderSearchFallback,
} from "@/components/site/header-search-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/custom/accordion";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/data-explorer/table/account-components";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-client-provider";
import { useAuthDialog } from "@/providers/auth-dialog-provider";
import { Bookmark, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

const NAV_ITEMS = [
  { label: "Home", href: "/", match: (path: string) => path === "/" },
  {
    label: "GPUs",
    href: "/gpus",
    match: (path: string) => path.startsWith("/gpus"),
  },
  {
    label: "LLMs",
    href: "/llms",
    match: (path: string) => path.startsWith("/llms"),
  },
  {
    label: "MLOps",
    href: "/tools",
    match: (path: string) => path.startsWith("/tools"),
  },
  {
    label: "Research",
    href: "/articles",
    match: (path: string) => path.startsWith("/articles"),
  },
];

export function AppHeaderNavigation({
  brand,
  desktopNavigation,
}: {
  brand: React.ReactNode;
  desktopNavigation: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const usesContainedHeader =
    pathname === "/" || pathname.startsWith("/articles");
  const isExplorerPath =
    pathname.startsWith("/gpus") ||
    pathname.startsWith("/llms") ||
    pathname.startsWith("/tools");
  const hasHeaderSearch =
    pathname === "/" ||
    isExplorerPath ||
    pathname.startsWith("/articles");
  const { session, isPending, signOut } = useAuth();
  const { showSignIn, showSignUp } = useAuthDialog();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  React.useEffect(() => setMenuOpen(false), [pathname]);

  const handleSignOut = React.useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  return (
    <>
      <div className="h-[var(--nav-header-height)] border-b border-border">
        <div
          className={cn(
            "mx-auto flex h-full w-full items-center gap-6",
            usesContainedHeader
              ? "max-w-[1400px] px-4 sm:px-8"
              : "max-w-none px-4",
          )}
        >
          {brand}
          {desktopNavigation}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {hasHeaderSearch ? (
              <div className="hidden w-64 min-w-[12rem] sm:block">
                <React.Suspense fallback={<HeaderSearchFallback />}>
                  <HeaderSearch />
                </React.Suspense>
              </div>
            ) : null}
            {isExplorerPath ? (
              <React.Suspense fallback={null}>
                <HeaderBookmarks pathname={pathname} />
              </React.Suspense>
            ) : null}
            <UserMenu
              user={user}
              onSignOut={handleSignOut}
              onSignIn={showSignIn}
              onSignUp={showSignUp}
              isSigningOut={isSigningOut}
              fullWidth={false}
              showDetails={false}
              isAuthenticated={Boolean(user)}
              isLoading={isPending}
              triggerClassName="!rounded-sm !bg-site-chrome"
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-sm border border-border bg-site-chrome lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-site-navigation"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {menuOpen ? (
        <nav
          id="mobile-site-navigation"
          className="border-b border-border bg-card px-4 py-3 lg:hidden"
          aria-label="Mobile navigation"
        >
          {hasHeaderSearch ? (
            <div className="mb-3 sm:hidden">
              <React.Suspense fallback={<HeaderSearchFallback />}>
                <HeaderSearch />
              </React.Suspense>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "rounded px-3 py-2 text-sm font-medium text-muted-foreground",
                  item.match(pathname) && "bg-accent text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Accordion type="single" collapsible>
              <AccordionItem value="bookmarks" className="border-none">
                <AccordionTrigger className="w-full rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:no-underline">
                  Bookmarks
                </AccordionTrigger>
                <AccordionContent className="px-0 [&>div]:pb-0">
                  <div className="grid gap-1 pl-6 pt-1">
                    {[
                      { label: "GPUs", href: "/gpus?bookmarks=true" },
                      { label: "LLMs", href: "/llms?bookmarks=true" },
                      { label: "MLOps", href: "/tools?bookmarks=true" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </nav>
      ) : null}
    </>
  );
}

function HeaderBookmarks({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("bookmarks") === "true";
  const basePath = pathname.startsWith("/llms")
    ? "/llms"
    : pathname.startsWith("/tools")
      ? "/tools"
      : "/gpus";
  const href = active ? basePath : `${basePath}?bookmarks=true`;

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="hidden rounded-sm border border-border bg-site-chrome lg:inline-flex"
      asChild
      title={active ? "Show all results" : "Bookmarks"}
    >
      <Link href={href} prefetch={false} aria-label={active ? "Show all results" : "Bookmarks"}>
        <Bookmark className="h-4 w-4" />
      </Link>
    </Button>
  );
}
