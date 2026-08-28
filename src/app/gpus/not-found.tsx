import { Track404 } from "@/components/analytics/track-404";
import { StatusPage } from "@/components/site/status-page";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title="GPU view not found."
      description="Check the address or return to the full GPU pricing explorer."
    >
      <Track404 />
      <Button asChild>
        <Link href="/gpus">Return to GPU pricing</Link>
      </Button>
    </StatusPage>
  );
}
