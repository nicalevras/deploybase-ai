"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAnalytics } from "@/lib/analytics";
import { useForm as useFormspree } from "@formspree/react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";

const submitSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name."),
    email: z.string().email("Enter a valid email address."),
    type: z.enum(["LLM", "GPU", "Tool"], { required_error: "Select a type." }),
    providerName: z.string().trim().optional(),
    toolName: z.string().trim().optional(),
    url: z
      .string()
      .trim()
      .transform((value) => {
        if (!value) return value;
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      })
      .pipe(z.string().url("Enter a valid URL.")),
    message: z
      .string()
      .trim()
      .min(10, "Message must be at least 10 characters."),
    _gotcha: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "Tool") {
      if (!data.toolName || data.toolName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter the tool name.",
          path: ["toolName"],
        });
      }
      return;
    }
    if (!data.providerName || data.providerName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter the provider name.",
        path: ["providerName"],
      });
    }
  });

type SubmitFormValues = z.infer<typeof submitSchema>;

interface SettingsSubmitFormProps {
  defaultName?: string;
  defaultEmail?: string;
  onCancel?: () => void;
}

export function SettingsSubmitForm({
  defaultName = "",
  defaultEmail = "",
  onCancel,
}: SettingsSubmitFormProps) {
  const plausible = useAnalytics();
  const [state, handleFormspreeSubmit] = useFormspree(
    process.env.NEXT_PUBLIC_FORMSPREE_SUBMITFORM_ID as string,
  );

  // [Analytics] Track provider submission form
  const hasTrackedSubmit = React.useRef(false);
  React.useEffect(() => {
    if (state.succeeded && !hasTrackedSubmit.current) {
      hasTrackedSubmit.current = true;
      plausible("Form Submit", { props: { form: "submit-provider" } });
    }
  }, [state.succeeded, plausible]);

  const {
    register,
    control,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    mode: "onChange",
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      providerName: "",
      toolName: "",
      url: "",
      message: "",
    },
  });

  const selectedType = useWatch({ control, name: "type" });
  const isProviderType = selectedType === "LLM" || selectedType === "GPU";
  const isToolType = selectedType === "Tool";

  const onSubmit = async (data: SubmitFormValues) => {
    await handleFormspreeSubmit(data);
  };

  if (state.succeeded) {
    return (
      <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
        Thanks! We received your submission and will review it soon.
      </div>
    );
  }

  const showFormspreeError = Boolean(
    state.errors && state.errors.getFormErrors().length > 0,
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="submit-name">Name</Label>
        <Input
          id="submit-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "submit-name-error" : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p
            id="submit-name-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="submit-email">Email</Label>
        <Input
          id="submit-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "submit-email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="submit-email-error"
            className="text-sm text-destructive"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label>Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                clearErrors(["type", "providerName", "toolName"]);
              }}
            >
              <SelectTrigger className="w-full border-border/60">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="GPU">GPU</SelectItem>
                <SelectItem value="LLM">LLM</SelectItem>
                <SelectItem value="Tool">Tool</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.type ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {errors.type.message}
          </p>
        ) : null}
      </div>

      {isProviderType ? (
        <div className="space-y-1">
          <Label htmlFor="submit-provider-name">Provider Name</Label>
          <Input
            id="submit-provider-name"
            type="text"
            placeholder="Provider name"
            aria-invalid={Boolean(errors.providerName)}
            aria-describedby={
              errors.providerName ? "submit-provider-name-error" : undefined
            }
            {...register("providerName")}
          />
          {errors.providerName ? (
            <p
              id="submit-provider-name-error"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {errors.providerName.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {isToolType ? (
        <div className="space-y-1">
          <Label htmlFor="submit-tool-name">Tool Name</Label>
          <Input
            id="submit-tool-name"
            type="text"
            placeholder="Tool name"
            aria-invalid={Boolean(errors.toolName)}
            aria-describedby={
              errors.toolName ? "submit-tool-name-error" : undefined
            }
            {...register("toolName")}
          />
          {errors.toolName ? (
            <p
              id="submit-tool-name-error"
              className="text-sm text-destructive"
              aria-live="polite"
            >
              {errors.toolName.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {isProviderType || isToolType ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="submit-url">URL</Label>
            <Input
              id="submit-url"
              type="url"
              autoComplete="url"
              placeholder="https://example.com"
              aria-invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? "submit-url-error" : undefined}
              {...register("url")}
            />
            {errors.url ? (
              <p
                id="submit-url-error"
                className="text-sm text-destructive"
                aria-live="polite"
              >
                {errors.url.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="submit-message">Message</Label>
            <Textarea
              id="submit-message"
              placeholder="Add any helpful details"
              rows={5}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? "submit-message-error" : undefined
              }
              {...register("message")}
            />
            {errors.message ? (
              <p
                id="submit-message-error"
                className="text-sm text-destructive"
                aria-live="polite"
              >
                {errors.message.message}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

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
          {state.submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
