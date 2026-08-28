"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight, Lock, Mail, Scale, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SettingsContactForm } from "./settings-contact-form";
import { SettingsSubmitForm } from "./settings-submit-form";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  isAuthenticated?: boolean;
}

const navItems = [
  { value: "profile", label: "Profile", icon: UserRound },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "security", label: "Security", icon: Lock },
  { value: "contact", label: "Contact", icon: Mail },
  { value: "legal", label: "Legal", icon: Scale },
];
const passwordProviderIds = ["email", "credentials", "credential", "password"];

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  isAuthenticated = true,
}: SettingsDialogProps) {
  const router = useRouter();
  const plausible = useAnalytics();
  const filteredNavItems = React.useMemo(
    () =>
      isAuthenticated
        ? navItems
        : navItems.filter(
            (item) => item.value === "contact" || item.value === "legal",
          ),
    [isAuthenticated],
  );
  const [activeItem, setActiveItem] = React.useState(filteredNavItems[0].value);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [revokeOtherSessions, setRevokeOtherSessions] = React.useState(true);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(
    null,
  );
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = React.useState(false);
  const [revokeSessionsMessage, setRevokeSessionsMessage] = React.useState<
    string | null
  >(null);
  const [revokeSessionsError, setRevokeSessionsError] = React.useState<
    string | null
  >(null);
  const [newsletterStatus, setNewsletterStatus] = React.useState<
    boolean | null
  >(null);
  const [isNewsletterLoading, setIsNewsletterLoading] = React.useState(false);
  const [isNewsletterUpdating, setIsNewsletterUpdating] = React.useState(false);
  const [newsletterError, setNewsletterError] = React.useState<string | null>(
    null,
  );
  const [isNewsletterCooldown, setIsNewsletterCooldown] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [isSubmitFormOpen, setIsSubmitFormOpen] = React.useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isTermsOpen, setIsTermsOpen] = React.useState(false);
  const isMounted = React.useRef(true);
  const newsletterCooldownTimeout = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const activeLabel =
    filteredNavItems.find((item) => item.value === activeItem)?.label ??
    "Settings";

  const initialName = user?.name?.trim() ?? "";
  const displayEmail = user?.email?.trim() ?? "";
  const displayImage = user?.image ?? "";
  const [profileName, setProfileName] = React.useState(initialName);
  const [nameInput, setNameInput] = React.useState(initialName);
  const closeResetTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  React.useEffect(() => {
    setProfileName(initialName);
    setNameInput(initialName);
  }, [initialName]);
  React.useEffect(() => {
    if (closeResetTimeout.current) {
      clearTimeout(closeResetTimeout.current);
      closeResetTimeout.current = null;
    }
    if (open) return;
    closeResetTimeout.current = setTimeout(() => {
      setActiveItem(filteredNavItems[0].value);
      setIsDeleteDialogOpen(false);
      setDeleteError(null);
      setIsEditingProfile(false);
      setProfileError(null);
      setIsSavingProfile(false);
      setProfileName(initialName);
      setNameInput(initialName);
      setIsChangingPassword(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setRevokeOtherSessions(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      setIsSavingPassword(false);
      setRevokeSessionsMessage(null);
      setRevokeSessionsError(null);
      setIsRevokingSessions(false);
      setIsDeleting(false);
      setNewsletterStatus(null);
      setIsNewsletterLoading(false);
      setIsNewsletterUpdating(false);
      setNewsletterError(null);
      setIsNewsletterCooldown(false);
      setDeletePassword("");
      setIsContactFormOpen(false);
      setIsSubmitFormOpen(false);
      setIsPrivacyOpen(false);
      setIsTermsOpen(false);
      closeResetTimeout.current = null;
    }, 200);
    return () => {
      if (closeResetTimeout.current) {
        clearTimeout(closeResetTimeout.current);
        closeResetTimeout.current = null;
      }
      if (newsletterCooldownTimeout.current) {
        clearTimeout(newsletterCooldownTimeout.current);
        newsletterCooldownTimeout.current = null;
      }
    };
  }, [open, initialName, filteredNavItems]);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const fallbackInitial = (profileName || displayEmail || "A")
    .charAt(0)
    .toUpperCase();

  const handleDeleteDialogChange = (nextOpen: boolean) => {
    setIsDeleteDialogOpen(nextOpen);
    if (!nextOpen) {
      setDeleteError(null);
      setDeletePassword("");
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({ current: "", next: "", confirm: "" });
    setPasswordError(null);
  };

  const handleTogglePassword = () => {
    setIsChangingPassword((prev) => {
      const next = !prev;
      if (!next) {
        resetPasswordForm();
        setPasswordSuccess(null);
      }
      return next;
    });
  };

  const handlePasswordFieldChange =
    (field: keyof typeof passwordForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords must match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const changeResult = await authClient.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
        revokeOtherSessions,
      });
      const changeError = (
        changeResult as
          | { error?: { code?: string; message?: string } }
          | undefined
      )?.error;
      if (changeError) {
        const friendlyError =
          changeError.code === "INVALID_PASSWORD"
            ? "Current password is incorrect"
            : changeError.message ||
              "Unable to change your password right now. Please try again.";
        if (isMounted.current) {
          setPasswordError(friendlyError);
        }
        return;
      }
      if (isMounted.current) {
        setPasswordSuccess("Password updated successfully.");
        resetPasswordForm();
        setIsChangingPassword(false);
      }
    } catch (error) {
      console.error("Failed to change password", error);
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to change your password right now. Please try again.";
      if (isMounted.current) {
        setPasswordError(fallbackMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsSavingPassword(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      if (hasEmailPasswordAccount && !deletePassword.trim()) {
        setDeleteError("Please enter your password to delete your account.");
        setIsDeleting(false);
        return;
      }
      const deletionResult = await authClient.deleteUser({
        callbackURL: "/",
        ...(hasEmailPasswordAccount ? { password: deletePassword } : {}),
      });
      const deletionError = (
        deletionResult as { error?: { message?: string } } | undefined
      )?.error;
      if (deletionError) {
        if (isMounted.current) {
          setDeleteError(
            deletionError.message ||
              "Unable to delete your account. Please try again.",
          );
        }
        return;
      }
      if (isMounted.current) {
        // [Analytics] Track account deletion
        plausible("Account Deleted");
        handleDeleteDialogChange(false);
        onOpenChange(false);
        router.replace("/", { scroll: false });
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete account", error);
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to delete your account. Please try again.";
      if (isMounted.current) {
        setDeleteError(fallbackMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsDeleting(false);
      }
    }
  };

  const handleProfileAction = async () => {
    if (isSavingProfile) return;
    if (!isEditingProfile) {
      setProfileError(null);
      setIsEditingProfile(true);
      setNameInput(profileName);
      return;
    }
    const nextName = nameInput.trim();
    if (nextName === profileName) {
      setIsEditingProfile(false);
      return;
    }
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      const updateResult = await authClient.updateUser({
        name: nextName || undefined,
      });
      const updateError = (
        updateResult as { error?: { message?: string } } | undefined
      )?.error;
      if (updateError) {
        if (isMounted.current) {
          setProfileError(
            updateError.message ||
              "Unable to save your profile right now. Please try again.",
          );
        }
        return;
      }
      if (isMounted.current) {
        setProfileName(nextName);
        setIsEditingProfile(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update profile", error);
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to save your profile right now. Please try again.";
      if (isMounted.current) {
        setProfileError(fallbackMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsSavingProfile(false);
      }
    }
  };

  const shouldFetchAccounts = open && Boolean(user);
  const userKey = user?.id ?? user?.email ?? "anonymous";
  const accountsQuery = useQuery({
    queryKey: ["auth", "accounts", userKey],
    queryFn: async () => {
      try {
        const result = await authClient.listAccounts();
        const listError = (
          result as { error?: { message?: string } } | undefined
        )?.error;
        if (listError) {
          throw new Error(
            listError.message || "Unable to load connected accounts.",
          );
        }
        const data = (result as { data?: unknown } | undefined)?.data ?? result;
        if (Array.isArray(data)) {
          return data;
        }
        throw new Error("Unexpected accounts payload");
      } catch (error) {
        console.error("Failed to load connected accounts", error);
        throw error;
      }
    },
    enabled: shouldFetchAccounts,
    staleTime: Infinity,
  });
  const connectedAccounts = React.useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    if (!Array.isArray(accounts)) return [];
    return accounts
      .map((account) => {
        const typed = account as { providerId?: string; accountId?: string };
        return {
          providerId: typed.providerId?.toLowerCase() ?? "unknown",
          accountId: typed.accountId ?? "",
        };
      })
      .filter((account) => Boolean(account.providerId));
  }, [accountsQuery.data]);
  const providerLabels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    huggingface: "Hugging Face",
    email: "Email and password",
  };
  const displayConnectedAccounts = React.useMemo(
    () =>
      connectedAccounts.filter(
        (account) => !passwordProviderIds.includes(account.providerId),
      ),
    [connectedAccounts],
  );
  const hasEmailPasswordAccount = React.useMemo(
    () =>
      connectedAccounts.some((account) =>
        passwordProviderIds.includes(account.providerId),
      ),
    [connectedAccounts],
  );
  const isPasswordChangeAllowed =
    accountsQuery.isSuccess && hasEmailPasswordAccount;
  const newsletterLabel =
    newsletterStatus === null
      ? "Checking..."
      : newsletterStatus
        ? "Subscribed"
        : "Unsubscribed";
  const newsletterDotClass =
    newsletterStatus === null
      ? "bg-foreground/30"
      : newsletterStatus
        ? "bg-emerald-500"
        : "bg-rose-500";
  const isNewsletterActionDisabled =
    isNewsletterLoading ||
    isNewsletterUpdating ||
    isNewsletterCooldown ||
    newsletterStatus === null ||
    !user?.email;

  const handleRevokeOtherSessions = async () => {
    if (isRevokingSessions) return;
    setRevokeSessionsError(null);
    setRevokeSessionsMessage(null);
    setIsRevokingSessions(true);
    try {
      const revokeResult = await authClient.revokeOtherSessions();
      const revokeError = (
        revokeResult as { error?: { message?: string } } | undefined
      )?.error;
      if (revokeError) {
        if (isMounted.current) {
          setRevokeSessionsError(
            revokeError.message ||
              "Unable to revoke other sessions. Please try again.",
          );
        }
        return;
      }
      if (isMounted.current) {
        setRevokeSessionsMessage("Other sessions revoked.");
      }
    } catch (error) {
      console.error("Failed to revoke other sessions", error);
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to revoke other sessions. Please try again.";
      if (isMounted.current) {
        setRevokeSessionsError(fallbackMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsRevokingSessions(false);
      }
    }
  };

  const shouldFetchNewsletter =
    open && activeItem === "notifications" && Boolean(user?.email);

  React.useEffect(() => {
    if (!shouldFetchNewsletter) return;
    if (newsletterStatus !== null) return;
    const controller = new AbortController();
    let cancelled = false;

    setIsNewsletterLoading(true);
    setNewsletterError(null);

    fetch("/api/newsletter", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load newsletter status.");
        }
        const payload = (await response.json()) as { subscribed?: boolean };
        if (!cancelled) {
          setNewsletterStatus(Boolean(payload?.subscribed));
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (!cancelled) {
          setNewsletterStatus(false);
          setNewsletterError(
            error instanceof Error && error.message
              ? error.message
              : "Unable to load newsletter status.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsNewsletterLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [newsletterStatus, shouldFetchNewsletter]);

  const startNewsletterCooldown = React.useCallback(() => {
    if (newsletterCooldownTimeout.current) {
      clearTimeout(newsletterCooldownTimeout.current);
    }
    setIsNewsletterCooldown(true);
    newsletterCooldownTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        setIsNewsletterCooldown(false);
      }
      newsletterCooldownTimeout.current = null;
    }, 3000);
  }, []);

  const handleNewsletterAction = async () => {
    if (isNewsletterUpdating || isNewsletterCooldown) return;
    if (!user?.email) {
      setNewsletterError("No email found for this account.");
      return;
    }
    const currentValue = newsletterStatus ?? false;
    const nextValue = !currentValue;
    const previousValue = currentValue;
    setNewsletterError(null);
    setNewsletterStatus(nextValue);
    setIsNewsletterUpdating(true);
    startNewsletterCooldown();

    try {
      const response = await fetch("/api/newsletter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: nextValue }),
      });

      if (!response.ok) {
        throw new Error("Unable to update newsletter preferences.");
      }

      const payload = (await response.json()) as { subscribed?: boolean };
      if (typeof payload?.subscribed === "boolean" && isMounted.current) {
        setNewsletterStatus(payload.subscribed);
        // [Analytics] Track newsletter preference change
        plausible(
          payload.subscribed
            ? "Newsletter Subscribe"
            : "Newsletter Unsubscribe",
        );
      }
    } catch (error) {
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to update newsletter preferences.";
      if (isMounted.current) {
        setNewsletterStatus(previousValue);
        setNewsletterError(fallbackMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsNewsletterUpdating(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-auto max-h-[88vh] max-w-4xl flex-col gap-0 overflow-y-auto overflow-x-hidden border border-border bg-site-chrome p-0 supports-[height:100svh]:max-h-[88svh] sm:h-[560px] sm:overflow-hidden sm:p-0 [&>button:last-of-type]:right-4 [&>button:last-of-type]:top-4 sm:[&>button:last-of-type]:right-6 sm:[&>button:last-of-type]:top-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid h-full flex-1 grid-cols-12">
          <aside className="col-span-4 hidden h-full border-r border-border bg-muted/30 sm:block">
            <div className="h-full overflow-y-auto px-5 py-6">
              <div className="space-y-2">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setActiveItem(item.value)}
                      className={[
                        "flex w-full items-center gap-2 rounded px-2.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "text-muted-foreground hover:bg-background hover:text-foreground",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "bg-transparent",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
          <section className="col-span-12 h-full overflow-hidden bg-transparent sm:col-span-8">
            <div className="flex h-full flex-col">
              <div className="px-4 py-4 sm:px-6 sm:pb-0 sm:pt-6">
                <div className="hidden items-center gap-2 text-sm text-foreground/70 sm:flex">
                  <span className="text-foreground/70">Settings</span>
                  <ChevronRight
                    className="h-3 w-3 text-foreground/70"
                    aria-hidden
                  />
                  <span className="font-medium text-foreground">
                    {activeLabel}
                  </span>
                </div>
                <div className="space-y-3 sm:hidden">
                  <p className="text-base font-semibold leading-none tracking-tight text-foreground">
                    Settings
                  </p>
                  <Select value={activeItem} onValueChange={setActiveItem}>
                    <SelectTrigger className="w-full border-border/60">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea
                className="min-h-0 flex-1"
                data-disable-hotkeys="true"
              >
                <div className="px-4 pb-4 pt-0 sm:px-6 sm:py-6">
                  {activeItem === "profile" ? (
                    <div>
                      <div className="border-t border-border py-5 sm:py-6">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">
                            Profile
                          </div>
                          <p className="text-sm text-foreground/70">
                            Manage your profile details and preferences.
                          </p>
                        </div>
                        <div className="mt-5 divide-y divide-border/70">
                          <div
                            className={
                              isEditingProfile
                                ? "flex flex-col gap-3 pb-5 sm:flex-row sm:flex-nowrap sm:items-start sm:gap-5"
                                : "flex flex-row flex-wrap items-start gap-3 pb-5 sm:flex-row sm:flex-nowrap sm:gap-5"
                            }
                          >
                            <Avatar className="h-12 w-12">
                              {displayImage ? (
                                <AvatarImage
                                  src={displayImage}
                                  alt={profileName || "Avatar"}
                                />
                              ) : null}
                              <AvatarFallback className="text-base font-semibold">
                                {fallbackInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-[180px] flex-1 space-y-1">
                              <Label htmlFor="settings-name">Name</Label>
                              {isEditingProfile ? (
                                <Input
                                  id="settings-name"
                                  value={nameInput}
                                  onChange={(event) =>
                                    setNameInput(event.target.value)
                                  }
                                  placeholder="Name or organization"
                                  disabled={isSavingProfile}
                                />
                              ) : (
                                <p className="text-sm text-foreground/70">
                                  {profileName || ""}
                                </p>
                              )}
                            </div>
                            <div className="flex w-full justify-end sm:w-auto sm:justify-start sm:self-start">
                              <Button
                                size="sm"
                                variant={
                                  isEditingProfile ? "default" : "outline"
                                }
                                onClick={handleProfileAction}
                                disabled={isSavingProfile}
                                className={[
                                  "w-full transition-colors duration-200 sm:w-auto",
                                  isEditingProfile ? "sm:mt-[30px]" : "",
                                ].join(" ")}
                              >
                                {isSavingProfile
                                  ? "Saving..."
                                  : isEditingProfile
                                    ? "Save"
                                    : "Edit"}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 py-4">
                            <Label>Email</Label>
                            <p className="text-sm text-foreground/70">
                              {displayEmail || "Not set"}
                            </p>
                          </div>
                          <div className="space-y-1 pt-4">
                            <Label>Connected accounts</Label>
                            {accountsQuery.isLoading ? (
                              <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
                            ) : null}
                            {!accountsQuery.isLoading &&
                            !accountsQuery.isError &&
                            displayConnectedAccounts.length === 0 ? (
                              <p className="text-sm text-foreground/70">None</p>
                            ) : null}
                            {!accountsQuery.isLoading &&
                            !accountsQuery.isError &&
                            displayConnectedAccounts.length > 0 ? (
                              <div className="space-y-1.5">
                                {displayConnectedAccounts.map((account) => {
                                  const label =
                                    providerLabels[account.providerId] ??
                                    account.providerId;
                                  return (
                                    <p
                                      key={`${account.providerId}:${account.accountId || "default"}`}
                                      className="text-sm text-foreground/70"
                                    >
                                      {label}
                                    </p>
                                  );
                                })}
                              </div>
                            ) : null}
                            {accountsQuery.isError ? (
                              <p className="text-sm text-destructive">
                                Unable to load connected accounts. Please try
                                again.
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {profileError ? (
                          <p className="pt-4 text-sm text-destructive">
                            {profileError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activeItem === "security" ? (
                    <div className="divide-y divide-border border-t border-border">
                      {isPasswordChangeAllowed ? (
                        <div className="py-5 sm:py-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-foreground">
                                Change password
                              </div>
                              <p className="text-sm text-foreground/70">
                                Update the password associated with your
                                account.
                              </p>
                            </div>
                            {!isChangingPassword ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleTogglePassword}
                              >
                                Change
                              </Button>
                            ) : null}
                          </div>
                          {isChangingPassword ? (
                            <form
                              className="mt-5 space-y-5"
                              onSubmit={handlePasswordSubmit}
                            >
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label htmlFor="current-password">
                                    Current password
                                  </Label>
                                  <Input
                                    id="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={passwordForm.current}
                                    onChange={handlePasswordFieldChange(
                                      "current",
                                    )}
                                    disabled={isSavingPassword}
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="new-password">
                                    New password
                                  </Label>
                                  <Input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordForm.next}
                                    onChange={handlePasswordFieldChange("next")}
                                    disabled={isSavingPassword}
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="confirm-password">
                                    Confirm new password
                                  </Label>
                                  <Input
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordForm.confirm}
                                    onChange={handlePasswordFieldChange(
                                      "confirm",
                                    )}
                                    disabled={isSavingPassword}
                                    required
                                  />
                                </div>
                              </div>
                              <label className="flex items-start gap-3 border-t border-border pt-4">
                                <Checkbox
                                  id="revoke-sessions"
                                  checked={revokeOtherSessions}
                                  onCheckedChange={(checked) =>
                                    setRevokeOtherSessions(Boolean(checked))
                                  }
                                  disabled={isSavingPassword}
                                />
                                <div className="space-y-1 text-sm">
                                  <span className="font-medium text-foreground">
                                    Revoke other sessions
                                  </span>
                                  <p className="text-foreground/70">
                                    Sign out on all other devices after the
                                    password changes.
                                  </p>
                                </div>
                              </label>
                              {passwordError ? (
                                <p
                                  className="text-sm text-destructive"
                                  aria-live="polite"
                                >
                                  {passwordError}
                                </p>
                              ) : null}
                              {passwordSuccess ? (
                                <p
                                  className="text-sm text-emerald-500"
                                  aria-live="polite"
                                >
                                  {passwordSuccess}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleTogglePassword}
                                  disabled={isSavingPassword}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={isSavingPassword}
                                >
                                  {isSavingPassword
                                    ? "Saving..."
                                    : "Save password"}
                                </Button>
                              </div>
                            </form>
                          ) : null}
                          {!isChangingPassword && passwordSuccess ? (
                            <p
                              className="mt-4 text-sm text-emerald-500"
                              aria-live="polite"
                            >
                              {passwordSuccess}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Session management
                            </div>
                            <p className="text-sm text-foreground/70">
                              Sign out from all other devices and keep this
                              session active.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRevokeOtherSessions}
                            disabled={isRevokingSessions}
                          >
                            {isRevokingSessions ? "Revoking..." : "Revoke"}
                          </Button>
                        </div>
                        {revokeSessionsError ? (
                          <p className="mt-3 text-sm text-destructive">
                            {revokeSessionsError}
                          </p>
                        ) : null}
                        {revokeSessionsMessage ? (
                          <p className="mt-3 text-sm text-emerald-500">
                            {revokeSessionsMessage}
                          </p>
                        ) : null}
                      </div>
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Delete account
                            </div>
                            <p className="text-sm text-foreground/70">
                              Permanently remove your account and all associated
                              data.
                            </p>
                          </div>
                          <Dialog
                            open={isDeleteDialogOpen}
                            onOpenChange={handleDeleteDialogChange}
                          >
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteDialogChange(true)}
                            >
                              Delete
                            </Button>
                            <DialogContent className="bg-site-chrome">
                              <DialogHeader>
                                <DialogTitle>Delete account</DialogTitle>
                                <DialogDescription>
                                  This will immediately remove your account and
                                  data. This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              {hasEmailPasswordAccount ? (
                                <div className="space-y-2">
                                  <Label htmlFor="delete-password">
                                    Password
                                  </Label>
                                  <Input
                                    id="delete-password"
                                    type="password"
                                    name="delete-password"
                                    autoComplete="new-password"
                                    value={deletePassword}
                                    onChange={(event) =>
                                      setDeletePassword(event.target.value)
                                    }
                                    disabled={isDeleting}
                                  />
                                </div>
                              ) : null}
                              {deleteError ? (
                                <p className="text-sm text-destructive">
                                  {deleteError}
                                </p>
                              ) : null}
                              <div className="flex justify-end gap-3 pt-2">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteDialogChange(false)
                                  }
                                  disabled={isDeleting}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteAccount}
                                  disabled={isDeleting}
                                >
                                  {isDeleting
                                    ? "Deleting..."
                                    : "Delete account"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeItem === "notifications" ? (
                    <div className="border-t border-border">
                      <div className="py-5 sm:py-6">
                        <div className="space-y-4 text-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <Label className="text-sm font-semibold text-foreground">
                                Newsletter
                              </Label>
                              {isNewsletterLoading ? (
                                <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
                              ) : (
                                <p className="font-medium text-foreground/70">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className={[
                                        "h-2 w-2 rounded-full",
                                        newsletterDotClass,
                                      ].join(" ")}
                                      aria-hidden="true"
                                    />
                                    {newsletterLabel}
                                  </span>
                                </p>
                              )}
                            </div>
                            {isNewsletterLoading ? (
                              <div className="h-8 w-full animate-pulse rounded bg-muted/70 sm:w-24" />
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleNewsletterAction}
                                disabled={isNewsletterActionDisabled}
                                className="w-full disabled:opacity-100 sm:w-auto"
                              >
                                {newsletterStatus ? "Unsubscribe" : "Subscribe"}
                              </Button>
                            )}
                          </div>
                          {newsletterError ? (
                            <p className="text-sm text-destructive">
                              {newsletterError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeItem === "contact" ? (
                    <div className="divide-y divide-border border-t border-border">
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Send us a message
                            </div>
                            <p className="text-sm text-foreground/70">
                              Reach out with questions or feedback.
                            </p>
                          </div>
                          {!isContactFormOpen ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsContactFormOpen(true)}
                            >
                              Contact
                            </Button>
                          ) : null}
                        </div>
                        {isContactFormOpen ? (
                          <div className="mt-5">
                            <SettingsContactForm
                              defaultName={user?.name?.trim() ?? ""}
                              defaultEmail={user?.email?.trim() ?? ""}
                              onCancel={() => setIsContactFormOpen(false)}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Submit
                            </div>
                            <p className="text-sm text-foreground/70">
                              Share an LLM provider, GPU cloud provider, or ML
                              tool.
                            </p>
                          </div>
                          {!isSubmitFormOpen ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsSubmitFormOpen(true)}
                            >
                              Submit
                            </Button>
                          ) : null}
                        </div>
                        {isSubmitFormOpen ? (
                          <div className="mt-5">
                            <SettingsSubmitForm
                              defaultName={user?.name?.trim() ?? ""}
                              defaultEmail={user?.email?.trim() ?? ""}
                              onCancel={() => setIsSubmitFormOpen(false)}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activeItem === "legal" ? (
                    <div className="divide-y divide-border border-t border-border">
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Privacy
                            </div>
                            <p className="text-sm text-foreground/70">
                              Learn how we collect, use, and protect your data.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsPrivacyOpen((prev) => !prev)}
                          >
                            View
                          </Button>
                        </div>
                        {isPrivacyOpen ? (
                          <ScrollArea className="mt-5 h-40 rounded-md border border-border/60 bg-background/60 p-4">
                            <div className="space-y-3 text-sm text-foreground/70">
                              <p className="font-semibold text-foreground">
                                Privacy Policy
                              </p>
                              <p className="text-xs text-foreground/50">
                                Effective Date: February 19, 2026
                              </p>

                              <p className="font-medium text-foreground">
                                1. Introduction
                              </p>
                              <p>
                                Deploybase (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
                                or &ldquo;our&rdquo;) respects your privacy.
                                This Privacy Policy explains what information we
                                collect, how we use it, and your rights
                                regarding that information.
                              </p>

                              <p className="font-medium text-foreground">
                                2. Information We Collect
                              </p>
                              <p>
                                <span className="italic">
                                  Account Information:
                                </span>{" "}
                                When you create an account, we collect your name
                                and email address. If you sign up using a
                                third-party provider (Google, GitHub, or Hugging
                                Face), we receive your name, email address, and
                                profile image from that provider.
                              </p>
                              <p>
                                <span className="italic">Newsletter:</span> By
                                creating an account, you are subscribed to our
                                newsletter. Your email and name are shared with
                                our email service provider (Resend) for this
                                purpose.
                              </p>
                              <p>
                                <span className="italic">Favorites:</span> If
                                you save favorites, we store those preferences
                                associated with your account.
                              </p>
                              <p>
                                We do not collect passwords for OAuth users. For
                                email/password accounts, passwords are securely
                                hashed and never stored in plain text.
                              </p>

                              <p className="font-medium text-foreground">
                                3. Analytics
                              </p>
                              <p>
                                We use Plausible Analytics, a privacy-friendly
                                analytics service. Plausible does not use
                                cookies, does not collect personal data, and
                                does not track users across websites. All
                                analytics data is aggregated and cannot be used
                                to identify individual users.
                              </p>

                              <p className="font-medium text-foreground">
                                4. Cookies
                              </p>
                              <p>
                                Deploybase uses only essential cookies required
                                for authentication (session cookies). We do not
                                use advertising cookies, tracking cookies, or
                                any third-party cookies for marketing purposes.
                              </p>

                              <p className="font-medium text-foreground">
                                5. How We Use Your Information
                              </p>
                              <p>We use the information we collect to:</p>
                              <ul className="list-disc space-y-1 pl-5">
                                <li>Provide and maintain the Service</li>
                                <li>
                                  Authenticate your identity and manage your
                                  account
                                </li>
                                <li>
                                  Send you our newsletter (which you may opt out
                                  of at any time)
                                </li>
                                <li>Store your favorites and preferences</li>
                                <li>
                                  Communicate important updates about the
                                  Service
                                </li>
                              </ul>

                              <p className="font-medium text-foreground">
                                6. Data Sharing
                              </p>
                              <p>
                                We do not sell, rent, or trade your personal
                                information. We share data only with the
                                following service providers, solely for
                                operating the Service:
                              </p>
                              <ul className="list-disc space-y-1 pl-5">
                                <li>
                                  <span className="font-medium">Resend</span>{" "}
                                  &mdash; email delivery and newsletter
                                  management
                                </li>
                                <li>
                                  <span className="font-medium">Vercel</span>{" "}
                                  &mdash; hosting and infrastructure
                                </li>
                                <li>
                                  <span className="font-medium">
                                    Better Auth
                                  </span>{" "}
                                  &mdash; authentication processing
                                </li>
                              </ul>
                              <p>
                                We may disclose information if required by law
                                or to protect our rights.
                              </p>

                              <p className="font-medium text-foreground">
                                7. Affiliate Links
                              </p>
                              <p>
                                Some links on the Service are affiliate links.
                                When you click an affiliate link, the
                                destination provider may use cookies or other
                                tracking technologies on their own site to
                                attribute the referral. We do not control the
                                privacy practices of third-party providers and
                                recommend reviewing their privacy policies.
                              </p>

                              <p className="font-medium text-foreground">
                                8. Data Retention
                              </p>
                              <p>
                                We retain your account information for as long
                                as your account is active. If you delete your
                                account, we will remove your personal data and
                                unsubscribe you from the newsletter. Some data
                                may be retained in backups for a limited period.
                              </p>

                              <p className="font-medium text-foreground">
                                9. Your Rights
                              </p>
                              <p>You have the right to:</p>
                              <ul className="list-disc space-y-1 pl-5">
                                <li>
                                  Access the personal data we hold about you
                                </li>
                                <li>Request correction of inaccurate data</li>
                                <li>Delete your account and associated data</li>
                                <li>
                                  Unsubscribe from the newsletter at any time
                                </li>
                                <li>Request a copy of your data</li>
                              </ul>
                              <p>
                                To exercise these rights, contact us at
                                hello@mail.deploybase.ai or delete your account
                                through the Service.
                              </p>

                              <p className="font-medium text-foreground">
                                10. Security
                              </p>
                              <p>
                                We implement reasonable technical and
                                organizational measures to protect your data,
                                including encrypted connections (HTTPS), secure
                                password hashing, and access controls. No system
                                is completely secure, and we cannot guarantee
                                absolute security.
                              </p>

                              <p className="font-medium text-foreground">
                                11. Children&apos;s Privacy
                              </p>
                              <p>
                                The Service is not intended for users under 16
                                years of age. We do not knowingly collect
                                information from children.
                              </p>

                              <p className="font-medium text-foreground">
                                12. Changes to This Policy
                              </p>
                              <p>
                                We may update this Privacy Policy from time to
                                time. We will notify you of material changes by
                                posting the updated policy on this page with a
                                revised effective date.
                              </p>

                              <p className="font-medium text-foreground">
                                13. Contact
                              </p>
                              <p>
                                For privacy-related inquiries, contact us at
                                hello@mail.deploybase.ai.
                              </p>
                            </div>
                          </ScrollArea>
                        ) : null}
                      </div>
                      <div className="py-5 sm:py-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              Terms and Conditions
                            </div>
                            <p className="text-sm text-foreground/70">
                              Review the rules and guidelines for using the
                              product.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsTermsOpen((prev) => !prev)}
                          >
                            View
                          </Button>
                        </div>
                        {isTermsOpen ? (
                          <ScrollArea className="mt-5 h-40 rounded-md border border-border/60 bg-background/60 p-4">
                            <div className="space-y-3 text-sm text-foreground/70">
                              <p className="font-semibold text-foreground">
                                Terms of Service
                              </p>
                              <p className="text-xs text-foreground/50">
                                Effective Date: February 19, 2026
                              </p>

                              <p className="font-medium text-foreground">
                                1. Acceptance of Terms
                              </p>
                              <p>
                                By accessing or using Deploybase (&ldquo;the
                                Service&rdquo;), operated by Deploybase
                                (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                                &ldquo;our&rdquo;), you agree to be bound by
                                these Terms of Service. If you do not agree, do
                                not use the Service.
                              </p>

                              <p className="font-medium text-foreground">
                                2. Description of the Service
                              </p>
                              <p>
                                Deploybase is an information aggregation
                                platform that collects, normalizes, and displays
                                publicly available data related to GPU cloud
                                pricing, large language models, and AI/ML tools.
                                We do not sell, resell, or broker any of the
                                products or services listed.
                              </p>

                              <p className="font-medium text-foreground">
                                3. No Warranties or Guarantees
                              </p>
                              <p>
                                All data displayed on Deploybase is provided
                                strictly on an &ldquo;as-is&rdquo; and
                                &ldquo;as-available&rdquo; basis. We make no
                                representations or warranties of any kind,
                                express or implied, regarding the accuracy,
                                completeness, reliability, timeliness, or
                                availability of any data. Pricing,
                                specifications, and availability shown may be
                                outdated or incorrect. Always verify information
                                directly with the relevant provider before
                                making purchasing decisions.
                              </p>

                              <p className="font-medium text-foreground">
                                4. Not Financial or Professional Advice
                              </p>
                              <p>
                                Nothing on this Service constitutes financial,
                                investment, legal, or professional advice.
                                Deploybase is a research and comparison tool
                                only. You are solely responsible for any
                                decisions made based on information found on the
                                Service.
                              </p>

                              <p className="font-medium text-foreground">
                                5. Accounts and Newsletter
                              </p>
                              <p>
                                When you create an account, you agree to provide
                                accurate information and are responsible for
                                maintaining the security of your credentials. By
                                creating an account, you consent to receiving
                                our newsletter. You may unsubscribe from the
                                newsletter at any time using the unsubscribe
                                link in any email.
                              </p>

                              <p className="font-medium text-foreground">
                                6. Intellectual Property
                              </p>
                              <p>
                                The original presentation, design, and
                                organization of data on Deploybase is our
                                property. The underlying data we aggregate is
                                publicly available and belongs to its respective
                                owners. You may not scrape, reproduce, or
                                redistribute the Service&apos;s compiled
                                datasets without written permission.
                              </p>

                              <p className="font-medium text-foreground">
                                7. Third-Party Content and Links
                              </p>
                              <p>
                                The Service displays data sourced from
                                third-party providers. We are not affiliated
                                with, endorsed by, or responsible for any
                                third-party provider&apos;s products, services,
                                pricing, or conduct. Any trademarks, logos, or
                                brand names displayed belong to their respective
                                owners.
                              </p>

                              <p className="font-medium text-foreground">
                                8. Affiliate Links and Compensation
                              </p>
                              <p>
                                Some links on Deploybase may be affiliate links,
                                meaning we may earn a commission if you click
                                through and make a purchase or sign up with a
                                third-party provider. This does not affect the
                                data we display or how providers are ranked,
                                sorted, or presented. Affiliate relationships do
                                not influence the accuracy or ordering of
                                information on the Service.
                              </p>

                              <p className="font-medium text-foreground">
                                9. DMCA and Takedown Requests
                              </p>
                              <p>
                                If you believe any content on Deploybase
                                infringes your intellectual property rights,
                                please contact us at hello@mail.deploybase.ai.
                                We will review and respond to valid takedown
                                requests promptly.
                              </p>

                              <p className="font-medium text-foreground">
                                10. Limitation of Liability
                              </p>
                              <p>
                                To the fullest extent permitted by law,
                                Deploybase and its operator shall not be liable
                                for any indirect, incidental, special,
                                consequential, or punitive damages, or any loss
                                of profits or revenue, whether incurred directly
                                or indirectly, arising from your use of the
                                Service. Our total aggregate liability shall not
                                exceed $100.
                              </p>

                              <p className="font-medium text-foreground">
                                11. Indemnification
                              </p>
                              <p>
                                You agree to indemnify and hold harmless
                                Deploybase and its operator from any claims,
                                damages, losses, or expenses arising from your
                                use of the Service or violation of these Terms.
                              </p>

                              <p className="font-medium text-foreground">
                                12. Modifications
                              </p>
                              <p>
                                We reserve the right to modify these Terms at
                                any time. Continued use of the Service after
                                changes constitutes acceptance of the updated
                                Terms.
                              </p>

                              <p className="font-medium text-foreground">
                                13. Termination
                              </p>
                              <p>
                                We may suspend or terminate your access to the
                                Service at any time, for any reason, without
                                notice.
                              </p>

                              <p className="font-medium text-foreground">
                                14. Governing Law
                              </p>
                              <p>
                                These Terms shall be governed by the laws of the
                                Commonwealth of Massachusetts, without regard to
                                conflict of law principles.
                              </p>

                              <p className="font-medium text-foreground">
                                15. Contact
                              </p>
                              <p>
                                Questions about these Terms may be directed to
                                hello@mail.deploybase.ai.
                              </p>
                            </div>
                          </ScrollArea>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
