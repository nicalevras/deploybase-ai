import { SiteFooter } from "@/components/site/site-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Deploybase",
  description: "Privacy Policy for Deploybase.",
};

export default function PrivacyPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-5 py-12 text-sm leading-6 text-foreground/80 sm:px-8 sm:py-16">
        <header className="border-b border-border pb-8">
          <p className="text-xs font-semibold text-signal">LEGAL</p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Effective February 19, 2026
          </p>
        </header>

        <section className="mt-10 space-y-8">
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">1. Introduction</h2>
            <p>
              Deploybase (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) respects your privacy. This Privacy Policy
              explains what information we collect, how we use it, and your
              rights regarding that information.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p>
              <span className="italic">Account Information:</span> When you
              create an account, we collect your name and email address. If you
              sign up using a third-party provider (Google, GitHub, or Hugging
              Face), we receive your name, email address, and profile image from
              that provider.
            </p>
            <p>
              <span className="italic">Newsletter:</span> By creating an
              account, you are subscribed to our newsletter. Your email and name
              are shared with our email service provider (Resend) for this
              purpose.
            </p>
            <p>
              <span className="italic">Favorites:</span> If you save favorites,
              we store those preferences associated with your account.
            </p>
            <p>
              We do not collect passwords for OAuth users. For email/password
              accounts, passwords are securely hashed and never stored in plain
              text.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">3. Analytics</h2>
            <p>
              We use Plausible Analytics, a privacy-friendly analytics service.
              Plausible does not use cookies, does not collect personal data,
              and does not track users across websites. All analytics data is
              aggregated and cannot be used to identify individual users.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">4. Cookies</h2>
            <p>
              Deploybase uses only essential cookies required for authentication
              (session cookies). We do not use advertising cookies, tracking
              cookies, or any third-party cookies for marketing purposes.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              5. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide and maintain the Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>
                Send you our newsletter (which you may opt out of at any time)
              </li>
              <li>Store your favorites and preferences</li>
              <li>Communicate important updates about the Service</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">6. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal information. We share
              data only with the following service providers, solely for
              operating the Service:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">Resend</span> &mdash; email
                delivery and newsletter management
              </li>
              <li>
                <span className="font-medium">Vercel</span> &mdash; hosting and
                infrastructure
              </li>
              <li>
                <span className="font-medium">Better Auth</span> &mdash;
                authentication processing
              </li>
            </ul>
            <p>
              We may disclose information if required by law or to protect our
              rights.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              7. Affiliate Links
            </h2>
            <p>
              Some links on the Service are affiliate links. When you click an
              affiliate link, the destination provider may use cookies or other
              tracking technologies on their own site to attribute the referral.
              We do not control the privacy practices of third-party providers
              and recommend reviewing their privacy policies.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">8. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is
              active. If you delete your account, we will remove your personal
              data and unsubscribe you from the newsletter. Some data may be
              retained in backups for a limited period.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">9. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Unsubscribe from the newsletter at any time</li>
              <li>Request a copy of your data</li>
            </ul>
            <p>
              To exercise these rights, contact us at hello@mail.deploybase.ai
              or delete your account through the Service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">10. Security</h2>
            <p>
              We implement reasonable technical and organizational measures to
              protect your data, including encrypted connections (HTTPS), secure
              password hashing, and access controls. No system is completely
              secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              11. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not intended for users under 16 years of age. We do
              not knowingly collect information from children.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              this page with a revised effective date.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">13. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at
              hello@mail.deploybase.ai.
            </p>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
