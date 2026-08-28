import type { Column } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> extends ButtonProps {
  column: Column<TData, TValue>;
  title: string;
  centerTitle?: boolean;
  titleClassName?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  centerTitle,
  titleClassName,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          className,
          centerTitle && "text-center",
          titleClassName,
        )}
      >
        {title}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        column.toggleSorting(undefined);
      }}
      className={cn(
        "flex h-7 items-center gap-2 px-3.5 py-0 text-xs font-semibold",
        "hover:bg-transparent active:bg-transparent focus-visible:bg-transparent hover:text-foreground",
        centerTitle ? "justify-center" : "justify-between",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          titleClassName,
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "flex items-center",
        )}
      >
        <ArrowUpDown
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            column.getIsSorted()
              ? "text-accent-foreground"
              : "text-foreground/70",
          )}
        />
      </span>
    </Button>
  );
}
