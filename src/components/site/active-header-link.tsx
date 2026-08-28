"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ActiveHeaderLink({
  label,
  href,
  exact = false,
}: {
  label: string;
  href: string;
  exact?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "relative flex h-full items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        active &&
          "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-signal",
      )}
    >
      {label}
    </Link>
  );
}
