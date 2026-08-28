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
      eyebrow="DIRECTORY UNAVAILABLE"
      title="We couldn't load MLOps data."
      description="The tools directory could not be loaded. Try the request again."
    >
      <Button onClick={reset}>Try again</Button>
    </StatusPage>
  );
}
