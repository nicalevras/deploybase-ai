import type { ReactNode } from "react";

export function StatusPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--app-header-height))] w-full max-w-3xl items-center px-5 py-16 sm:px-8">
      <div className="w-full border-y border-border py-12 text-center">
        <p className="text-xs font-semibold text-signal">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-7 flex justify-center">{children}</div>
      </div>
    </div>
  );
}
