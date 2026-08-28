import { Track404 } from "@/components/analytics/track-404";
import { StatusPage } from "@/components/site/status-page";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title="LLM view not found."
      description="Check the address or return to the full inference explorer."
    >
      <Track404 />
      <Button asChild>
        <Link href="/llms">Return to LLM inference</Link>
      </Button>
    </StatusPage>
  );
}
