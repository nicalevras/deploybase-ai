"use client";

import { Github } from "@/components/icons/github";
import { Google } from "@/components/icons/google";
import { HuggingFace } from "@/components/icons/huggingface";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import type { OAuthAvailability } from "@/lib/auth-configuration";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-client-provider";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export type AuthView = "signIn" | "signUp" | "forgotPassword";

interface AuthDialogProps {
  open: boolean;
  initialView: AuthView;
  onOpenChange: (open: boolean) => void;
  onViewChange?: (view: AuthView) => void;
  onComplete?: (destination: string) => void;
  callbackUrl?: string;
  errorCallbackUrl?: string;
  defaultEmail?: string;
  contentClassName?: string;
  bodyClassName?: string;
  isCompleting?: boolean;
  oauthProviders: OAuthAvailability;
}

export function AuthDialog({
  open,
  initialView,
  onOpenChange,
  onViewChange,
  onComplete,
  callbackUrl = "/",
  errorCallbackUrl,
  defaultEmail,
  contentClassName,
  bodyClassName,
  isCompleting = false,
  oauthProviders,
}: AuthDialogProps) {
  const seededEmail = React.useRef(false);
  const [view, setView] = React.useState<AuthView>(initialView);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = React.useState(false);
  const [socialPending, setSocialPending] = React.useState<
    "github" | "google" | "huggingface" | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [resetEmailSent, setResetEmailSent] = React.useState(false);
  const { refetch } = useAuth();
  const plausible = useAnalytics();
  const isLocked = pending || isCompleting;
  const isLoading = isLocked;
  const defaultAvatarDataUrl = React.useMemo(() => {
    const randomColor = () => Math.floor(Math.random() * 256);
    const colorA = `rgb(${randomColor()},${randomColor()},${randomColor()})`;
    const colorB = `rgb(${randomColor()},${randomColor()},${randomColor()})`;
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="geometricPrecision">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colorA}" />
            <stop offset="100%" style="stop-color:${colorB}" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g)" />
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }, []);

  React.useEffect(() => {
    setView(initialView);
  }, [initialView]);

  React.useEffect(() => {
    if (defaultEmail && !seededEmail.current) {
      setEmail(defaultEmail);
      seededEmail.current = true;
    }
  }, [defaultEmail, open]);

  React.useEffect(() => {
    if (!open) {
      setPending(false);
      setSocialPending(null);
      setError(null);
      setSuccessMessage(null);
      setResetEmailSent(false);
      setPassword("");
      setName("");
      setAgreedToPolicies(false);
      if (!defaultEmail) {
        setEmail("");
      }
      seededEmail.current = false;
    }
  }, [defaultEmail, open]);

  const copy = React.useMemo(() => {
    if (view === "signIn") {
      return {
        title: "Sign in",
        description: "Please sign in to continue",
        cta: isLoading ? "Signing in…" : "Sign in",
        alternateLabel: "Don't have an account?",
        alternateAction: "Sign up",
      };
    }

    if (view === "forgotPassword") {
      return {
        title: "Reset your password",
        description:
          "Enter your email address and we'll send you a link to reset your password",
        cta: pending ? "Sending…" : "Send reset link",
        alternateLabel: "Remember your password?",
        alternateAction: "Sign in",
      };
    }

    return {
      title: "Sign up",
      description: "Please fill in the details to get started",
      cta: pending ? "Creating…" : "Create account",
      alternateLabel: "Already have an account?",
      alternateAction: "Sign in",
    };
  }, [isLoading, pending, view]);

  const switchView = React.useCallback(
    (next: AuthView) => {
      if (next === view) return;
      setView(next);
      setError(null);
      onViewChange?.(next);
    },
    [onViewChange, view],
  );

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.email(
        {
          email,
          password,
          callbackURL: callbackUrl,
        },
        {
          onError: (ctx) => {
            // Handle email verification required error
            if (ctx.error.status === 403) {
              setError(
                "Please verify your email address before signing in. Check your inbox for a verification link.",
              );
            } else {
              setError(ctx.error.message);
            }
          },
        },
      );

      if (!result.error) {
        // [Analytics] Track email login
        plausible("Login", { props: { method: "email" } });
        await refetch();
        onComplete?.(callbackUrl);
      }
    } catch (err) {
      setError("We could not sign you in. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleEmailSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Please enter your name.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email(
        {
          email,
          password,
          name: normalizedName,
          image: defaultAvatarDataUrl,
          callbackURL: callbackUrl,
        },
        {
          onError: (ctx) => setError(ctx.error.message),
        },
      );

      if (!result.error) {
        // [Analytics] Track email signup
        plausible("Signup", { props: { method: "email" } });
        // Email verification is required, so show success message instead of signing in
        setError(null); // Clear any errors
        setSuccessMessage(
          "Account created! Please check your email and click the verification link to sign in.",
        );
        // Switch to sign-in view
        setView("signIn");
      }
    } catch (err) {
      setError("We could not create your account. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      // Type assertion: better-auth 1.4.x BetterFetch conditional types
      // fail to resolve with TS 5.7, but the method exists at runtime.
      const result = await (
        authClient as unknown as {
          forgetPassword: (data: {
            email: string;
            redirectTo: string;
          }) => Promise<{ error: { message: string } | null }>;
        }
      ).forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (!result.error) {
        // [Analytics] Track forgot password request
        plausible("Forgot Password");
        setResetEmailSent(true);
        setError(null);
        setSuccessMessage(
          "Password reset link sent! Check your email for instructions.",
        );
      }
    } catch (err) {
      setError("We could not send the reset email. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    setSocialPending("google");
    setError(null);
    try {
      // [Analytics] Track Google auth (fires before OAuth redirect)
      plausible("Signup", { props: { method: "google" } });
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
        errorCallbackURL: errorCallbackUrl ?? callbackUrl ?? "/",
        newUserCallbackURL: callbackUrl,
      });
    } catch (err) {
      setError("Google sign in failed. Please try again.");
      setSocialPending(null);
    }
  };

  const handleGithub = async () => {
    setSocialPending("github");
    setError(null);
    try {
      // [Analytics] Track GitHub auth (fires before OAuth redirect)
      plausible("Signup", { props: { method: "github" } });
      await authClient.signIn.social({
        provider: "github",
        callbackURL: callbackUrl,
        errorCallbackURL: errorCallbackUrl ?? callbackUrl ?? "/",
        newUserCallbackURL: callbackUrl,
      });
    } catch (err) {
      setError("GitHub sign in failed. Please try again.");
      setSocialPending(null);
    }
  };

  const handleHuggingFace = async () => {
    setSocialPending("huggingface");
    setError(null);
    try {
      // [Analytics] Track Hugging Face auth (fires before OAuth redirect)
      plausible("Signup", { props: { method: "huggingface" } });
      await authClient.signIn.social({
        provider: "huggingface",
        callbackURL: callbackUrl,
        errorCallbackURL: errorCallbackUrl ?? callbackUrl ?? "/",
        newUserCallbackURL: callbackUrl,
      });
    } catch (err) {
      setError("Hugging Face sign in failed. Please try again.");
      setSocialPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md gap-0 border-border bg-site-chrome p-6 sm:p-7",
          contentClassName,
        )}
      >
        <div className={cn("grid gap-6", bodyClassName)}>
          <DialogHeader className="text-left">
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription className="text-foreground/70">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          {view !== "forgotPassword" &&
          Object.values(oauthProviders).some(Boolean) ? (
            <div className="grid gap-6">
              <div className="flex items-center justify-center gap-6">
                {oauthProviders.google ? (
                  <SocialButton
                    provider="google"
                    icon={Google}
                    pending={socialPending === "google"}
                    disabled={socialPending !== null || isCompleting}
                    onClick={handleGoogle}
                    label="Continue with Google"
                  />
                ) : null}
                {oauthProviders.github ? (
                  <SocialButton
                    provider="github"
                    icon={Github}
                    pending={socialPending === "github"}
                    disabled={socialPending !== null || isCompleting}
                    onClick={handleGithub}
                    label="Continue with GitHub"
                  />
                ) : null}
                {oauthProviders.huggingface ? (
                  <SocialButton
                    provider="huggingface"
                    icon={HuggingFace}
                    pending={socialPending === "huggingface"}
                    disabled={socialPending !== null || isCompleting}
                    onClick={handleHuggingFace}
                    label="Continue with Hugging Face"
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                <span>or continue with</span>
                <Separator className="flex-1" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {view === "signIn" ? (
            <form className="grid gap-4" onSubmit={handleEmailSignIn}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Label htmlFor="password" className="block">
                    Password
                  </Label>
                  {view === "signIn" && (
                    <Button
                      type="button"
                      variant="link"
                      className="absolute -top-[11px] right-0 h-auto px-0 text-sm text-foreground/70 hover:text-foreground"
                      onClick={() => switchView("forgotPassword")}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <Button type="submit" disabled={isLocked}>
                {copy.cta}
              </Button>
            </form>
          ) : view === "forgotPassword" ? (
            <form className="grid gap-4" onSubmit={handleForgotPassword}>
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <Button type="submit" disabled={isLocked}>
                {copy.cta}
              </Button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={handleEmailSignUp}>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Name or organization"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-foreground/80">
                <Checkbox
                  id="signup-terms"
                  checked={agreedToPolicies}
                  onCheckedChange={(checked) =>
                    setAgreedToPolicies(Boolean(checked))
                  }
                  disabled={isLocked}
                />
                <span className="leading-5">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <Button type="submit" disabled={isLocked || !agreedToPolicies}>
                {copy.cta}
              </Button>
            </form>
          )}

          <div>
            <div className="text-center text-sm text-foreground/70">
              {copy.alternateLabel}{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto px-0 py-0 text-sm"
                onClick={() => {
                  if (view === "signIn") {
                    switchView("signUp");
                  } else if (view === "signUp") {
                    switchView("signIn");
                  } else if (view === "forgotPassword") {
                    switchView("signIn");
                  }
                }}
              >
                {copy.alternateAction}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SocialButtonProps {
  provider: "github" | "google" | "huggingface";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  label: string;
}

const socialButtonClassName =
  "flex w-full items-center justify-center rounded border border-border bg-background text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70";

function SocialButton({
  icon: Icon,
  onClick,
  disabled,
  pending,
  label,
}: SocialButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(socialButtonClassName, "py-2")}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
