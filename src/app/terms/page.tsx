import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Koku, a free spaced repetition flashcard application.",
  openGraph: {
    title: "Terms of Service | Koku",
    description:
      "Terms of Service for Koku, a free spaced repetition flashcard application.",
    url: "https://www.koku.cards/terms",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pb-8 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
        {title}
      </h2>
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            <Image
              src="/koku-circle-logo.svg"
              alt=""
              width={28}
              height={28}
              className="dark:invert"
            />
            Koku
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last updated: March 20, 2026
          </p>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the
            Koku website and application at{" "}
            <a
              href="https://koku.cards"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
            >
              koku.cards
            </a>{" "}
            (the &ldquo;Service&rdquo;). Koku is operated by an individual
            developer (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;), not a corporation or LLC.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            By creating an account or using the Service, you agree to be bound
            by these Terms. If you do not agree, do not use the Service.
          </p>
        </div>

        <div className="space-y-8">
          {/* The Service */}
          <Section title="The Service">
            <p>
              Koku is a free, web-based spaced repetition flashcard application.
              The Service allows you to create, organize, and study flashcard
              decks with features including Markdown formatting,
              syntax-highlighted code blocks, image support, spaced repetition
              scheduling (FSRS algorithm), offline study mode, data
              import/export, and customizable study settings.
            </p>
          </Section>

          {/* Accounts */}
          <Section title="Accounts">
            <p>
              To use the Service, you must create an account using Google OAuth
              or email magic link authentication. You are responsible for
              maintaining the security of your account and for all activity that
              occurs under it. You agree to provide accurate information when
              creating your account.
            </p>
            <p>
              You must be at least 13 years old to use the Service. If you are
              under 18, you represent that you have your parent or
              guardian&apos;s consent to use the Service.
            </p>
          </Section>

          {/* Acceptable Use */}
          <Section title="Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violate any applicable law or regulation</li>
              <li>
                Upload content that is illegal, abusive, threatening,
                defamatory, or that infringes on the intellectual property
                rights of others
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other
                users&apos; accounts, or the underlying systems and
                infrastructure
              </li>
              <li>
                Interfere with or disrupt the Service, servers, or networks
                connected to the Service
              </li>
              <li>
                Use the Service to distribute malware, spam, or any other
                harmful content
              </li>
              <li>
                Reverse engineer, decompile, or attempt to extract the source
                code of the Service (note: Koku is open source, so you are
                welcome to view and contribute to the source code through its
                public repository under the terms of its open source license)
              </li>
              <li>
                Use automated tools (bots, scrapers, etc.) to access the Service
                in a manner that places undue load on our infrastructure
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate your account if you
              violate these Terms.
            </p>
          </Section>

          {/* Your Content */}
          <Section title="Your Content">
            <SubSection title="Ownership">
              <p>
                You retain full ownership of all content you create, upload, or
                store through the Service, including flashcard decks, cards,
                images, tags, and templates (&ldquo;Your Content&rdquo;). We do
                not claim any intellectual property rights over Your Content.
              </p>
            </SubSection>

            <SubSection title="License to Us">
              <p>
                By uploading or storing content on the Service, you grant us a
                limited, non-exclusive license to host, store, and transmit Your
                Content solely for the purpose of operating and providing the
                Service to you. This license exists only for as long as your
                content remains on the Service and terminates when you delete
                your content or your account.
              </p>
            </SubSection>

            <SubSection title="Your Responsibility">
              <p>
                You are solely responsible for Your Content. You represent that
                you have the necessary rights to any content you upload and that
                Your Content does not violate the rights of any third party.
              </p>
            </SubSection>
          </Section>

          {/* Data and Privacy */}
          <Section title="Data and Privacy">
            <p>
              Our collection and use of your personal information is described
              in our{" "}
              <Link
                href="/privacy"
                className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
              >
                Privacy Policy
              </Link>
              . By using the Service, you agree to the practices described in
              that policy.
            </p>

            <SubSection title="Data Export">
              <p>
                You may export your flashcard data at any time in Anki (.apkg),
                CSV, or JSON format.
              </p>
            </SubSection>

            <SubSection title="Account Deletion">
              <p>
                You may delete your account and all associated data at any time
                through the Settings page. Deletion is permanent and
                irreversible &mdash; all decks, cards, review history, images,
                templates, and settings will be removed.
              </p>
            </SubSection>
          </Section>

          {/* Intellectual Property */}
          <Section title="Intellectual Property">
            <p>
              The Service itself &mdash; including its design, code, branding,
              logo, and the name &ldquo;Koku&rdquo; &mdash; is our intellectual
              property or is licensed to us. These Terms do not grant you any
              rights to use our branding or trademarks. The Koku source code is
              available under its open source license, and your use of the
              source code is governed by that license.
            </p>
          </Section>

          {/* Disclaimer of Warranties */}
          <Section title="Disclaimer of Warranties">
            <p className="uppercase text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available,&rdquo; without warranties of any kind, either express
              or implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or
              non-infringement.
            </p>
            <p>We do not warrant that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                The Service will be available at all times or without
                interruption
              </li>
              <li>
                The Service will be free of errors, bugs, or security
                vulnerabilities
              </li>
              <li>
                Any data stored on the Service will be preserved indefinitely or
                without loss
              </li>
              <li>
                The spaced repetition scheduling will produce any particular
                learning outcome
              </li>
            </ul>
            <p>
              You use the Service at your own risk. We strongly recommend that
              you regularly export your data as a backup.
            </p>
          </Section>

          {/* Limitation of Liability */}
          <Section title="Limitation of Liability">
            <div className="space-y-3 uppercase text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
              <p>
                To the maximum extent permitted by applicable law, we shall not
                be liable for any indirect, incidental, special, consequential,
                or punitive damages, or any loss of data, profits, revenue, or
                goodwill, arising out of or related to your use of or inability
                to use the Service, regardless of the theory of liability.
              </p>
              <p>
                To the maximum extent permitted by applicable law, our total
                aggregate liability for all claims related to the Service shall
                not exceed the amount you have paid us in the twelve (12) months
                preceding the claim. Because the Service is currently free, this
                amount is zero dollars ($0.00).
              </p>
              <p>
                Some jurisdictions do not allow the exclusion or limitation of
                certain warranties or liability. In such jurisdictions, our
                liability shall be limited to the greatest extent permitted by
                law.
              </p>
            </div>
          </Section>

          {/* Indemnification */}
          <Section title="Indemnification">
            <p>
              You agree to indemnify and hold us harmless from any claims,
              damages, losses, or expenses (including reasonable attorney&apos;s
              fees) arising from your use of the Service, your violation of
              these Terms, or your violation of any rights of a third party.
            </p>
          </Section>

          {/* Service Availability and Changes */}
          <Section title="Service Availability and Changes">
            <p>
              Koku is a free, independently operated project. We reserve the
              right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Modify, update, or discontinue the Service (or any part of it)
                at any time, with or without notice
              </li>
              <li>
                Change features, functionality, or the scope of the Service
              </li>
              <li>
                Impose limits on certain features or restrict access to parts of
                the Service
              </li>
            </ul>
            <p>
              If we discontinue the Service entirely, we will make reasonable
              efforts to provide advance notice so you can export your data.
              However, we are not obligated to maintain the Service
              indefinitely.
            </p>
          </Section>

          {/* Changes to These Terms */}
          <Section title="Changes to These Terms">
            <p>
              We may update these Terms from time to time. If we make material
              changes, we will update the &ldquo;Last updated&rdquo; date at the
              top of this page. Your continued use of the Service after changes
              are posted constitutes your acceptance of the updated Terms. If
              you do not agree to the updated Terms, you should stop using the
              Service and delete your account.
            </p>
          </Section>

          {/* Governing Law */}
          <Section title="Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Washington, United States, without regard
              to its conflict of law provisions.
            </p>
          </Section>

          {/* Severability */}
          <Section title="Severability">
            <p>
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary, and the remaining provisions shall
              remain in full force and effect.
            </p>
          </Section>

          {/* Entire Agreement */}
          <Section title="Entire Agreement">
            <p>
              These Terms, together with the{" "}
              <Link
                href="/privacy"
                className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
              >
                Privacy Policy
              </Link>
              , constitute the entire agreement between you and us regarding
              your use of the Service and supersede any prior agreements.
            </p>
          </Section>

          {/* Contact */}
          <Section title="Contact">
            <p>If you have questions about these Terms, you can reach us at:</p>
            <p>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:help@koku.cards"
                className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
              >
                help@koku.cards
              </a>
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 mt-16">
        <div className="flex items-center justify-center gap-4 text-sm text-slate-400 dark:text-slate-500">
          <span>&copy; {new Date().getFullYear()} Koku</span>
          <span>&middot;</span>
          <Link
            href="/privacy"
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Privacy
          </Link>
          <span>&middot;</span>
          <Link
            href="/terms"
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
