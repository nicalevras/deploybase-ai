"use client";

import { StatusPage } from "@/components/site/status-page";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <StatusPage
      eyebrow="REQUEST FAILED"
      title="Something unexpected happened."
      description="Try the request again. If the problem continues, contact support."
    >
      <Button onClick={reset}>Try again</Button>
    </StatusPage>
  );
}
