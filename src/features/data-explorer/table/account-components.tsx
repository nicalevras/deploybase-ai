"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/custom/accordion";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/custom/sheet";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableFilterControls } from "@/features/data-explorer/data-table/data-table-filter-controls";
import { DataTableResetButton } from "@/features/data-explorer/data-table/data-table-reset-button";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Bot,
  EllipsisVertical,
  LogIn,
  LogOut,
  Search,
  Server,
  Settings as SettingsIcon,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when dialog is opened
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const LazySettingsDialog = dynamic(
  () =>
    import("./settings-dialog").then((module) => ({
      default: module.SettingsDialog,
    })),
  {
    ssr: false, // Client-only - only loads when settings dialog is opened
  },
);

export interface AccountUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UserMenuProps {
  user: AccountUser | null | undefined;
  onSignOut: () => void;
  isSigningOut: boolean;
  fullWidth?: boolean;
  showDetails?: boolean;
  triggerClassName?: string;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
  forceUnauthSignInButton?: boolean;
  isLoading?: boolean;
}

export function UserMenu({
  user,
  onSignOut,
  isSigningOut,
  fullWidth = true,
  showDetails = true,
  triggerClassName,
  isAuthenticated: isAuthenticatedProp,
  onSignIn,
  onSignUp,
  forceUnauthSignInButton = false,
  isLoading = false,
}: UserMenuProps) {
  const normalizedName = user?.name?.trim();
  const email = user?.email ?? "";
  const displayName = normalizedName || email || "Account";
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const hasImage = Boolean(user?.image);
  const avatarSizeClass = showDetails ? "h-9 w-9" : "h-9 w-9";
  const avatarWrapperClass = avatarSizeClass;
  const avatarImageClass = "h-full w-full rounded-full object-cover";
  const inferredAuthenticated = Boolean(normalizedName || email || user?.image);
  const isAuthenticated = isAuthenticatedProp ?? inferredAuthenticated;
  const shouldRenderAvatar = (showDetails || hasImage) && user;
  const hasSignInHandler = typeof onSignIn === "function";
  const hasSignUpHandler = typeof onSignUp === "function";
  const shouldForceSignInButton =
    forceUnauthSignInButton &&
    !isAuthenticated &&
    (hasSignUpHandler || hasSignInHandler);
  const secondaryText = isAuthenticated ? (email ?? "") : "Sign up or Sign in";
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false);

  const handleSignInClick = React.useCallback(() => {
    onSignIn?.();
  }, [onSignIn]);

  const handleSignUpClick = React.useCallback(() => {
    onSignUp?.();
  }, [onSignUp]);

  const triggerAriaLabel = !showDetails ? displayName : undefined;

  let triggerElement: React.ReactNode;

  if (isLoading) {
    if (!showDetails) {
      return (
        <Skeleton className={cn("h-9 w-9 rounded-full", triggerClassName)} />
      );
    }
    return (
      <div
        className={cn(
          "flex items-center gap-3",
          fullWidth ? "w-full" : "w-auto",
          triggerClassName,
        )}
      >
        <Skeleton className={cn("shrink-0 rounded-full", avatarSizeClass)} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (shouldForceSignInButton) {
    const buttonClassName = cn(
      "flex h-auto items-center gap-3 rounded-md p-0 text-left text-sm font-medium text-foreground hover:text-accent-foreground",
      showDetails
        ? "bg-transparent hover:bg-transparent"
        : "border border-border bg-background text-foreground hover:bg-muted",
      fullWidth ? "w-full" : "w-auto",
      !showDetails
        ? "!gap-1.5 !rounded-md !px-2 !py-1.5 md:h-9 md:rounded-md"
        : null,
    );
    const preferredActionLabel = hasSignUpHandler ? "Sign up" : "Sign in";
    const ariaLabel = showDetails
      ? undefined
      : (triggerAriaLabel ?? preferredActionLabel);
    const primaryClickHandler = hasSignUpHandler
      ? handleSignUpClick
      : handleSignInClick;

    triggerElement = showDetails ? (
      <div
        className={cn(
          "flex items-center gap-3",
          fullWidth ? "w-full" : "w-auto",
          triggerClassName,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto flex-1 items-center gap-3 bg-transparent p-0 text-left text-sm font-medium text-foreground hover:bg-transparent hover:text-accent-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none"
          onClick={primaryClickHandler}
          disabled={isSigningOut}
          aria-label={ariaLabel}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full border border-border bg-muted/50 text-foreground/70",
              avatarSizeClass,
            )}
          >
            <LogIn className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-sm font-semibold">
              {displayName}
            </span>
            {secondaryText ? (
              <span className="truncate text-xs text-foreground/70">
                {secondaryText}
              </span>
            ) : null}
          </div>
        </Button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center bg-transparent p-0 hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none"
            aria-label="Open account menu"
            disabled={isSigningOut}
          >
            <EllipsisVertical className="h-4 w-4 text-foreground" />
            <span className="sr-only">Open account menu</span>
          </button>
        </DropdownMenuTrigger>
      </div>
    ) : (
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "flex items-center text-sm font-medium text-foreground hover:text-accent-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none",
            "!h-9 !w-9 justify-center rounded-full border border-border bg-background px-0 hover:bg-muted",
            triggerClassName,
          )}
          disabled={isSigningOut}
          aria-label={ariaLabel}
        >
          <LogIn className="h-4 w-4 text-foreground/70" />
          <span className="sr-only">{preferredActionLabel}</span>
        </Button>
      </DropdownMenuTrigger>
    );
  } else {
    triggerElement = (
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "flex items-center text-sm font-medium text-foreground hover:text-accent-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none",
            showDetails
              ? "h-auto gap-3 bg-transparent p-0 hover:bg-transparent"
              : "!h-9 !w-9 justify-center rounded-full px-0",
            !showDetails &&
              !shouldRenderAvatar &&
              "border border-border bg-background text-foreground hover:bg-muted",
            showDetails && (fullWidth ? "w-full justify-start" : "w-auto"),
            triggerClassName,
          )}
          disabled={isSigningOut}
          aria-label={triggerAriaLabel}
        >
          {shouldRenderAvatar ? (
            <div className={cn("relative", avatarSizeClass)}>
              {hasImage && !imageLoaded ? (
                <Skeleton className={cn("rounded-full", avatarSizeClass)} />
              ) : null}
              <Avatar
                className={cn(
                  avatarWrapperClass,
                  hasImage && !imageLoaded ? "opacity-0" : "opacity-100",
                )}
              >
                {hasImage ? (
                  <AvatarImage
                    src={user!.image!}
                    alt={displayName}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                    className={avatarImageClass}
                  />
                ) : null}
              </Avatar>
            </div>
          ) : null}
          {!shouldRenderAvatar && !showDetails ? (
            <EllipsisVertical className="h-4 w-4 text-foreground" />
          ) : null}
          {!showDetails ? null : (
            <>
              {showDetails ? (
                <div className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-sm font-semibold">
                    {displayName}
                  </span>
                  {secondaryText ? (
                    <span className="truncate text-xs text-foreground/70">
                      {secondaryText}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {showDetails ? (
                <EllipsisVertical className="h-4 w-4 text-foreground" />
              ) : null}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
    );
  }

  return (
    <div>
      <DropdownMenu>
        {triggerElement}
        <DropdownMenuContent
          align="end"
          className="mt-1 w-auto rounded border-border bg-site-chrome sm:mr-0 sm:mt-0"
        >
          <div className="flex flex-col space-y-1">
            {isAuthenticated ? (
              <Accordion
                type="single"
                collapsible
                className="-mx-2 w-[calc(100%+16px)] px-2"
              >
                <AccordionItem value="favorites" className="border-none">
                  <AccordionTrigger className="flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground">
                    <span className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      <span>Bookmarks</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pt-0 [&>div]:pb-0">
                    <div className="relative flex flex-col gap-1 pl-[25px]">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-1 left-[15px] top-1 w-px bg-muted"
                      />
                      <DropdownMenuItem
                        asChild
                        className={
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 pl-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                        }
                      >
                        <Link href="/gpus?bookmarks=true">
                          <span>GPUs</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        asChild
                        className={
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 pl-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                        }
                      >
                        <Link href="/llms?bookmarks=true">
                          <span>LLMs</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        asChild
                        className={
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 pl-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                        }
                      >
                        <Link href="/tools?bookmarks=true">
                          <span>MLOps</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
          {isAuthenticated ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                onSelect={() => {
                  setIsSettingsDialogOpen(true);
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                onSelect={() => {
                  if (!isSigningOut) {
                    onSignOut();
                  }
                }}
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4" />
                <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                onSelect={() => {
                  onSignIn?.();
                }}
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                onSelect={() => {
                  onSignUp?.();
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span>Sign up</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:no-underline focus-visible:bg-muted focus-visible:text-accent-foreground"
                onSelect={() => {
                  setIsSettingsDialogOpen(true);
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </>
          )}
          {isAuthenticated ? (
            <>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuLabel className="flex items-center gap-2 p-1 sm:hidden">
                <Avatar className="h-8 w-8">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={displayName} />
                  ) : null}
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {displayName}
                  </span>
                  {email ? (
                    <span className="truncate text-xs text-foreground/70">
                      {email}
                    </span>
                  ) : null}
                </div>
              </DropdownMenuLabel>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {isSettingsDialogOpen ? (
        <LazySettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          user={user}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}

interface SidebarPanelProps {
  user: AccountUser | null | undefined;
  isSigningOut: boolean;
  onSignOut: () => void;
  className?: string;
  showUserMenuFooter?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
  isAuthLoading?: boolean;
}

export function SidebarPanel({
  user,
  isSigningOut,
  onSignOut,
  className,
  showUserMenuFooter = true,
  onSignIn,
  onSignUp,
  isAuthLoading = false,
}: SidebarPanelProps) {
  const isAuthenticated = Boolean(user);
  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      <div className="scrollbar-hide flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-full">
          <DataTableFilterControls />
        </div>
      </div>
      {showUserMenuFooter ? (
        <div className="flex-shrink-0 border-t border-border p-2">
          <UserMenu
            user={user}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            forceUnauthSignInButton
            isAuthenticated={isAuthenticated}
            isLoading={isAuthLoading}
          />
        </div>
      ) : null}
    </div>
  );
}

interface MobileTopNavProps {
  brandLabel?: string;
  user: AccountUser | null;
  onSignOut: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  isSigningOut: boolean;
  renderSidebar: () => React.ReactNode;
  sheetTitle?: string;
  isAuthLoading?: boolean;
}

export function MobileTopNav({
  brandLabel = "Deploybase",
  user,
  onSignOut,
  onSignIn,
  onSignUp,
  isSigningOut,
  renderSidebar,
  sheetTitle = "Search",
  isAuthLoading = false,
}: MobileTopNavProps) {
  const brandLabelDisplay = brandLabel;
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const navItems = React.useMemo(
    () => [
      {
        label: "GPUs",
        value: "/gpus",
        isCurrent: pathname === "/" || pathname.startsWith("/gpus"),
        icon: Server,
      },
      {
        label: "LLMs",
        value: "/llms",
        isCurrent: pathname.startsWith("/llms"),
        icon: Bot,
      },
      {
        label: "MLOps",
        value: "/tools",
        isCurrent: pathname.startsWith("/tools"),
        icon: Wrench,
      },
    ],
    [pathname],
  );

  const currentNavValue =
    navItems.find((item) => item.isCurrent)?.value ?? "/gpus";
  const currentNavItem = navItems.find((item) => item.isCurrent);

  // Detect bookmarks mode from URL search params
  const searchParams = useSearchParams();
  const isBookmarksMode = searchParams.get("bookmarks") === "true";

  const handleNavChange = React.useCallback(
    (value: string) => {
      if (!value) return;
      if (value === pathname) return;
      router.push(value);
    },
    [pathname, router],
  );

  return (
    <NavigationMenu className="flex w-full max-w-none justify-between px-4 pt-2 sm:hidden">
      <NavigationMenuList className="grid w-full grid-cols-3 items-center gap-2">
        <NavigationMenuItem className="flex min-w-0 justify-start">
          <div className="flex h-9 items-center">
            <Link href="/" prefetch={false} className="text-lg tracking-tight">
              <span className="font-light text-foreground">deploy</span>
              <span className="font-bold text-foreground">base</span>
            </Link>
          </div>
        </NavigationMenuItem>
        <NavigationMenuItem className="flex min-w-0 justify-center">
          <div className="flex h-9 items-center">
            <Select
              value={currentNavValue}
              onValueChange={handleNavChange}
              onOpenChange={(open) => {
                // Prefetch all nav routes when Select opens
                if (open) {
                  navItems.forEach((item) => {
                    if (item.value !== pathname) {
                      router.prefetch(item.value);
                    }
                  });
                }
              }}
            >
              <SelectTrigger
                className="h-9 w-auto gap-2 rounded-full border-0 bg-transparent p-0 text-accent-foreground shadow-none hover:text-accent-foreground"
                aria-label={`${brandLabelDisplay} navigation`}
              >
                <SelectValue aria-label={currentNavItem?.label}>
                  {currentNavItem && (
                    <span className="flex min-w-0 items-center gap-2">
                      {isBookmarksMode ? (
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <currentNavItem.icon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      {currentNavItem.label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="mt-1 rounded sm:mt-0">
                {navItems.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="cursor-pointer gap-2"
                    onPointerDown={(e) => {
                      // Only navigate for same-page clicks in bookmarks mode
                      if (isBookmarksMode && item.value === currentNavValue) {
                        e.preventDefault();
                        router.push(item.value);
                      }
                    }}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </NavigationMenuItem>
        <NavigationMenuItem className="flex justify-end gap-2">
          <UserMenu
            user={user}
            onSignOut={onSignOut}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            isSigningOut={isSigningOut}
            fullWidth={false}
            showDetails={false}
            isAuthenticated={Boolean(user)}
            isLoading={isAuthLoading}
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-border bg-background text-foreground hover:bg-muted"
              >
                <Search
                  className="h-[18px] w-[18px] text-foreground"
                  strokeWidth={1.5}
                />
                <span className="sr-only">Toggle filters</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="overflow-y-auto p-0 sm:max-w-md"
              hideClose
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{sheetTitle}</SheetTitle>
                <SheetDescription>Filters and account options</SheetDescription>
              </SheetHeader>
              <div className="p-4">
                <div className="mb-[14px] flex h-6 items-center justify-end gap-1">
                  <DataTableResetButton />
                  <Separator orientation="vertical" className="mx-1" />
                  <SheetClose asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <X className="h-5 w-5 text-accent-foreground" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>
                {renderSidebar()}
              </div>
            </SheetContent>
          </Sheet>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
