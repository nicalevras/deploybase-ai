import { SiteFooter } from "@/components/site/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Deploybase",
  description: "Terms of Service for Deploybase.",
};

export default function TermsPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-5 py-12 text-sm leading-6 text-foreground/80 sm:px-8 sm:py-16">
        <header className="border-b border-border pb-8">
          <p className="text-xs font-semibold text-signal">LEGAL</p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Effective February 19, 2026
          </p>
        </header>

        <section className="mt-10 space-y-8">
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Deploybase (&ldquo;the Service&rdquo;),
              operated by Deploybase (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              2. Description of the Service
            </h2>
            <p>
              Deploybase is an information aggregation platform that collects,
              normalizes, and displays publicly available data related to GPU
              cloud pricing, large language models, and AI/ML tools. We do not
              sell, resell, or broker any of the products or services listed.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              3. No Warranties or Guarantees
            </h2>
            <p>
              All data displayed on Deploybase is provided strictly on an
              &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. We make
              no representations or warranties of any kind, express or implied,
              regarding the accuracy, completeness, reliability, timeliness, or
              availability of any data. Pricing, specifications, and
              availability shown may be outdated or incorrect. Always verify
              information directly with the relevant provider before making
              purchasing decisions.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              4. Not Financial or Professional Advice
            </h2>
            <p>
              Nothing on this Service constitutes financial, investment, legal,
              or professional advice. Deploybase is a research and comparison
              tool only. You are solely responsible for any decisions made based
              on information found on the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              5. Accounts and Newsletter
            </h2>
            <p>
              When you create an account, you agree to provide accurate
              information and are responsible for maintaining the security of
              your credentials. By creating an account, you consent to receiving
              our newsletter. You may unsubscribe from the newsletter at any
              time using the unsubscribe link in any email.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              6. Intellectual Property
            </h2>
            <p>
              The original presentation, design, and organization of data on
              Deploybase is our property. The underlying data we aggregate is
              publicly available and belongs to its respective owners. You may
              not scrape, reproduce, or redistribute the Service&apos;s compiled
              datasets without written permission.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              7. Third-Party Content and Links
            </h2>
            <p>
              The Service displays data sourced from third-party providers. We
              are not affiliated with, endorsed by, or responsible for any
              third-party provider&apos;s products, services, pricing, or
              conduct. Any trademarks, logos, or brand names displayed belong to
              their respective owners.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              8. Affiliate Links and Compensation
            </h2>
            <p>
              Some links on Deploybase may be affiliate links, meaning we may
              earn a commission if you click through and make a purchase or sign
              up with a third-party provider. This does not affect the data we
              display or how providers are ranked, sorted, or presented.
              Affiliate relationships do not influence the accuracy or ordering
              of information on the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              9. DMCA and Takedown Requests
            </h2>
            <p>
              If you believe any content on Deploybase infringes your
              intellectual property rights, please contact us at
              hello@mail.deploybase.ai. We will review and respond to valid
              takedown requests promptly.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              10. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Deploybase and its
              operator shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of
              profits or revenue, whether incurred directly or indirectly,
              arising from your use of the Service. Our total aggregate
              liability shall not exceed $100.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              11. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Deploybase and its
              operator from any claims, damages, losses, or expenses arising
              from your use of the Service or violation of these Terms.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">12. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued
              use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">13. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any
              time, for any reason, without notice.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">14. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the Commonwealth of
              Massachusetts, without regard to conflict of law principles.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">15. Contact</h2>
            <p>
              Questions about these Terms may be directed to
              hello@mail.deploybase.ai.
            </p>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
