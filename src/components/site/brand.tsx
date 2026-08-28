import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandProps {
  compact?: boolean;
  className?: string;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <Link
      href="/"
      prefetch={false}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="Deploybase home"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
        db
      </span>
      {!compact ? (
        <span className="text-[17px] font-semibold leading-none">deploybase</span>
      ) : null}
    </Link>
  );
}
