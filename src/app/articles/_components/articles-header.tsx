"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-client-provider";
import { useAuthDialog } from "@/providers/auth-dialog-provider";
import { UserMenu } from "@/features/data-explorer/table/account-components";
import { cn } from "@/lib/utils";
import { Bot, Server, Wrench, Newspaper } from "lucide-react";
import * as React from "react";

const navItems = [
  { label: "GPUs", href: "/gpus", icon: Server, match: "/gpus" },
  { label: "LLMs", href: "/llms", icon: Bot, match: "/llms" },
  { label: "MLOps", href: "/tools", icon: Wrench, match: "/tools" },
  { label: "Articles", href: "/articles", icon: Newspaper, match: "/articles" },
];

export function ArticlesHeader() {
  const pathname = usePathname() ?? "";
  const { session, isPending, signOut } = useAuth();
  const { showSignIn, showSignUp } = useAuthDialog();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null;

  const handleSignOut = React.useCallback(async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }, [signOut]);

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link href="/" prefetch={false} className="text-lg tracking-tight">
          <span className="font-light text-foreground">deploy</span>
          <span className="font-bold text-foreground">base</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname.startsWith(item.match)
                  ? "text-foreground font-medium"
                  : "text-foreground/50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <nav className="flex items-center gap-4 sm:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "transition-colors hover:text-foreground",
                pathname.startsWith(item.match)
                  ? "text-foreground"
                  : "text-foreground/40",
              )}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
        </nav>

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
        />
      </div>
    </header>
  );
}
