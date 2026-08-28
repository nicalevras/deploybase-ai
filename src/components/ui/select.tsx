"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import * as React from "react";

type HotkeyCombo = {
  combo: string;
  value: string;
  preventDefault?: boolean;
};

type SelectProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Root
> & {
  hotkeys?: HotkeyCombo[];
};

const Select = ({
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  hotkeys,
  ...props
}: SelectProps) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(valueProp ?? defaultValue);
  const isControlled = valueProp !== undefined;
  const currentValue = isControlled ? valueProp : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  React.useEffect(() => {
    if (isControlled) return;
    setUncontrolledValue(valueProp ?? defaultValue);
  }, [defaultValue, isControlled, valueProp]);

  React.useEffect(() => {
    if (!hotkeys || hotkeys.length === 0) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (isTypingInInput(event.target)) return;
      const matched = hotkeys.find((entry) => matchesCombo(event, entry.combo));
      if (!matched) return;

      if (matched.preventDefault !== false) {
        event.preventDefault();
      }
      handleValueChange(matched.value);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleValueChange, hotkeys]);

  return (
    <SelectPrimitive.Root
      value={currentValue}
      onValueChange={handleValueChange}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  );
};

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-sm border border-input bg-site-chrome py-2 pl-3 pr-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-foreground/70" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
    enableShortcuts?: boolean;
  }
>(
  (
    {
      className,
      children,
      position = "popper",
      enableShortcuts = true,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const handleRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === "function") {
          ref(node);
          return;
        }
        if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (enableShortcuts) {
          const key = event.key?.toLowerCase?.() ?? "";
          if (/^[a-z0-9]$/.test(key)) {
            const target = contentRef.current?.querySelector<HTMLElement>(
              `[data-select-shortcut="${key}"]`,
            );
            if (target) {
              event.preventDefault();
              target.click();
              return;
            }
          }
        }

        onKeyDown?.(event);
      },
      [enableShortcuts, onKeyDown],
    );

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={handleRef}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] origin-[--radix-select-content-transform-origin] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className,
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1",
              position === "popper" &&
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  },
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

interface SelectItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  shortcut?: string | number;
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, shortcut, ...props }, ref) => {
  const normalizedShortcut = React.useMemo(
    () => normalizeShortcut(shortcut ?? null),
    [shortcut],
  );
  const displayShortcut = normalizedShortcut
    ? normalizedShortcut.toUpperCase()
    : null;

  return (
    <SelectPrimitive.Item
      ref={ref}
      data-select-shortcut={normalizedShortcut ?? undefined}
      aria-keyshortcuts={displayShortcut ?? undefined}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-muted hover:text-foreground data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[state=checked]:bg-transparent data-[state=checked]:data-[highlighted]:bg-transparent data-[highlighted]:text-foreground data-[state=checked]:data-[highlighted]:text-foreground data-[state=checked]:text-foreground data-[disabled]:opacity-50 data-[state=checked]:data-[highlighted]:hover:bg-muted data-[state=checked]:data-[highlighted]:hover:text-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText asChild>
        <span className="flex min-w-0 items-center gap-2 pr-2">{children}</span>
      </SelectPrimitive.ItemText>
      {displayShortcut ? (
        <span className="-mt-[2px] ml-auto pl-1">
          <span className="inline-flex h-[18px] select-none items-center gap-1 rounded border bg-accent px-[6px] py-0 font-mono text-xs font-normal text-muted-foreground">
            <span className="mr-0.5 opacity-90">
              {typeof navigator !== "undefined" &&
              /Mac|iPhone|iPad/.test(navigator.userAgent)
                ? "⌘"
                : "Ctrl"}
            </span>
            <span className="tracking-tight">{displayShortcut}</span>
          </span>
        </span>
      ) : null}
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

function normalizeShortcut(shortcut?: string | number | null) {
  if (shortcut === undefined || shortcut === null) return null;
  const normalized = String(shortcut).trim().toLowerCase();
  if (normalized.length !== 1) return null;
  return /^[a-z0-9]$/.test(normalized) ? normalized : null;
}

function isTypingInInput(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  const editable = target.getAttribute("contenteditable");
  return (
    tag === "input" ||
    tag === "textarea" ||
    editable === "" ||
    editable === "true"
  );
}

function matchesCombo(event: KeyboardEvent, combo: string) {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  if (!parts.length) return false;

  const mainKey = parts.pop();
  if (!mainKey) return false;

  const requiresMeta =
    parts.includes("meta") ||
    parts.includes("cmd") ||
    parts.includes("command");
  const requiresCtrl = parts.includes("ctrl") || parts.includes("control");
  const requiresShift = parts.includes("shift");
  const requiresAlt = parts.includes("alt") || parts.includes("option");
  const requiresMod = parts.includes("mod");

  const metaOkay = requiresMeta ? event.metaKey : true;
  const ctrlOkay = requiresCtrl ? event.ctrlKey : true;
  const shiftOkay = requiresShift ? event.shiftKey : true;
  const altOkay = requiresAlt ? event.altKey : true;
  const modOkay = requiresMod ? event.metaKey || event.ctrlKey : true;

  const key = event.key?.toLowerCase?.() ?? "";
  return (
    metaOkay && ctrlOkay && shiftOkay && altOkay && modOkay && key === mainKey
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
