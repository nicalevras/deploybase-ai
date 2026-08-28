"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as React from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<SubmitState>("idle");
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? "Too many attempts. Try again later."
            : response.status === 400
              ? "Enter a valid email address."
              : "Unable to subscribe right now.",
        );
      }

      setEmail("");
      setState("success");
      setMessage("You are on the list.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to subscribe right now.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 max-w-md">
      <div className="flex gap-2">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="Email address"
          autoComplete="email"
          inputMode="email"
          required
          aria-label="Email address"
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          disabled={state === "submitting"}
          className="h-10 shrink-0 gap-1.5"
        >
          {state === "submitting" ? "Joining" : "Subscribe"}
        </Button>
      </div>
      {message ? (
        <p
          className="mt-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
