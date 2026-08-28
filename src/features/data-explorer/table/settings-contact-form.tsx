"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAnalytics } from "@/lib/analytics";
import { useForm as useFormspree } from "@formspree/react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().email("Enter a valid email address."),
  message: z.string().trim().min(10, "Message must be at least 10 characters."),
  _gotcha: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface SettingsContactFormProps {
  defaultName?: string;
  defaultEmail?: string;
  onCancel?: () => void;
}

export function SettingsContactForm({
  defaultName = "",
  defaultEmail = "",
  onCancel,
}: SettingsContactFormProps) {
  const plausible = useAnalytics();
  const [state, handleFormspreeSubmit] = useFormspree(
    process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID as string,
  );

  // [Analytics] Track contact form submission
  const hasTrackedSubmit = React.useRef(false);
  React.useEffect(() => {
    if (state.succeeded && !hasTrackedSubmit.current) {
      hasTrackedSubmit.current = true;
      plausible("Form Submit", { props: { form: "contact" } });
    }
  }, [state.succeeded, plausible]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    await handleFormspreeSubmit(data);
  };

  if (state.succeeded) {
    return (
      <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
        Thanks! We received your message and will get back to you shortly.
      </div>
    );
  }

  const showFormspreeError = Boolean(
    state.errors && state.errors.getFormErrors().length > 0,
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p
            id="contact-name-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="contact-email-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          placeholder="How can we help?"
          rows={5}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
          {...register("message")}
        />
        {errors.message ? (
          <p
            id="contact-message-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.message.message}
          </p>
        ) : null}
      </div>

      <input
        type="text"
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        {...register("_gotcha")}
      />

      {showFormspreeError ? (
        <p className="text-sm text-destructive" aria-live="polite">
          Something went wrong. Please try again in a moment.
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {onCancel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={state.submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={state.submitting}>
          {state.submitting ? "Sending..." : "Send message"}
        </Button>
      </div>
    </form>
  );
}
