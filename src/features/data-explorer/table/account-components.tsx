"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  EllipsisVertical,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  UserPlus,
} from "lucide-react";
// Use next/dynamic with ssr: false for truly client-only lazy loading
// This prevents any SSR/prefetching and ensures components only load when dialog is opened
import dynamic from "next/dynamic";
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
          {isAuthenticated ? (
            <>
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
