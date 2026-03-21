import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Koku collects, uses, and protects your information when you use the Koku flashcard app.",
  openGraph: {
    title: "Privacy Policy | Koku",
    description:
      "Learn how Koku collects, uses, and protects your information when you use the Koku flashcard app.",
    url: "https://www.koku.cards/privacy",
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

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last updated: March 20, 2026
          </p>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            This Privacy Policy describes how Koku (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and protects
            your information when you use the Koku website and application at{" "}
            <a
              href="https://koku.cards"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
            >
              koku.cards
            </a>{" "}
            (the &ldquo;Service&rdquo;). Koku is operated by an individual
            developer, not a corporation or LLC.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            By using the Service, you agree to the collection and use of
            information as described in this policy.
          </p>
        </div>

        <div className="space-y-8">
          {/* Information We Collect */}
          <Section title="Information We Collect">
            <SubSection title="Account Information">
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Email address</strong> &mdash; provided through Google
                  OAuth or magic link authentication
                </li>
                <li>
                  <strong>Google profile information</strong> &mdash; if you
                  sign in with Google, we receive your name and email address as
                  provided by Google&apos;s OAuth service
                </li>
              </ul>
            </SubSection>

            <SubSection title="User-Generated Content">
              <p>When you use the Service, we store:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Flashcard content</strong> &mdash; decks, cards
                  (including front/back text in Markdown format), and tags you
                  create
                </li>
                <li>
                  <strong>Images</strong> &mdash; photos or images you upload to
                  your cards (limited to JPEG, PNG, and WebP formats, up to 5 MB
                  each)
                </li>
                <li>
                  <strong>Card templates</strong> &mdash; reusable templates you
                  create for card formatting
                </li>
              </ul>
            </SubSection>

            <SubSection title="Study Data">
              <p>We collect data related to your study activity, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Review history</strong> &mdash; timestamps, ratings
                  (Again, Hard, Good, Easy), and the card state at the time of
                  each review
                </li>
                <li>
                  <strong>Spaced repetition scheduling data</strong> &mdash;
                  stability, difficulty, interval, repetition count, lapse
                  count, and due dates for each card, used by the FSRS algorithm
                  to schedule your reviews
                </li>
              </ul>
            </SubSection>

            <SubSection title="Preferences and Settings">
              <p>We store your chosen settings, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Theme preference (light, dark, or system)</li>
                <li>Accent color and font preferences</li>
                <li>SRS interval settings and daily new card limits</li>
                <li>Default card template selection</li>
                <li>Vacation mode status</li>
              </ul>
            </SubSection>

            <SubSection title="Locally Stored Data">
              <p>
                The Service uses <strong>IndexedDB</strong> in your browser to
                temporarily queue review data when you are offline. This data is
                stored locally on your device and is automatically synced to our
                servers when your internet connection is restored. We also
                request persistent storage permission from your browser to
                prevent this offline queue from being cleared unexpectedly.
              </p>
            </SubSection>

            <SubSection title="Cookies">
              <p>
                We use cookies strictly for{" "}
                <strong>authentication and session management</strong>. These
                cookies are set by Supabase (our authentication and database
                provider) and are necessary for the Service to function. We do
                not use advertising cookies, tracking cookies, or any
                third-party cookies for analytics or marketing purposes.
              </p>
            </SubSection>
          </Section>

          {/* How We Use Your Information */}
          <Section title="How We Use Your Information">
            <p>We use the information we collect solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Provide and operate the Service (authentication, storing your
                flashcards, scheduling reviews)
              </li>
              <li>
                Sync your study progress across devices and after offline
                sessions
              </li>
              <li>Apply your personalization settings</li>
              <li>Enable data import and export features</li>
            </ul>
            <p>
              We do <strong>not</strong> use your information for advertising,
              marketing, profiling, or any purpose unrelated to providing the
              Service.
            </p>
          </Section>

          {/* Data Sharing and Third Parties */}
          <Section title="Data Sharing and Third Parties">
            <p>
              We do <strong>not</strong> sell, rent, or share your personal
              information with third parties for their own purposes.
            </p>
            <p>
              Your data is processed by the following service providers, solely
              to operate the Service:
            </p>
            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 dark:border-slate-600 p-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Supabase
                </p>
                <p className="mt-1">
                  Cloud database and authentication provider. Your account
                  information, flashcard content, images, and study data are
                  stored in Supabase&apos;s infrastructure.{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
                  >
                    Privacy policy
                  </a>
                </p>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-600 p-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Vercel
                </p>
                <p className="mt-1">
                  Hosting and deployment platform for the Service&apos;s website
                  and application code.{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
                  >
                    Privacy policy
                  </a>
                </p>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-600 p-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Google
                </p>
                <p className="mt-1">
                  If you sign in via Google OAuth, Google processes your
                  authentication.{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 underline"
                  >
                    Privacy policy
                  </a>
                </p>
              </div>
            </div>
          </Section>

          {/* Data Security */}
          <Section title="Data Security">
            <p>We take reasonable measures to protect your data, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Row Level Security (RLS)</strong> &mdash; enforced at
                the database level, ensuring that each user can only access
                their own data
              </li>
              <li>
                <strong>Encrypted connections</strong> &mdash; all data
                transmitted between your browser and the Service is encrypted
                via HTTPS
              </li>
              <li>
                <strong>Scoped storage</strong> &mdash; uploaded images are
                stored in user-specific directories with access policies that
                restrict access to the owning user
              </li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. While we
              strive to protect your information, we cannot guarantee absolute
              security.
            </p>
          </Section>

          {/* Data Retention and Deletion */}
          <Section title="Data Retention and Deletion">
            <p>We retain your data for as long as your account is active.</p>
            <p>
              You can{" "}
              <strong>delete your account and all associated data</strong> at
              any time through the Settings page in the application. When you
              delete your account:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your user account is permanently removed</li>
              <li>
                All decks, cards, tags, review history, templates, and settings
                are permanently deleted
              </li>
              <li>All uploaded images are permanently removed from storage</li>
            </ul>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              This deletion is irreversible.
            </p>
          </Section>

          {/* Data Export */}
          <Section title="Data Export">
            <p>
              You can export your flashcard data at any time in multiple
              formats, including Anki (.apkg), CSV, and JSON. This ensures you
              are never locked in to the Service and can take your data with
              you.
            </p>
          </Section>

          {/* Children's Privacy */}
          <Section title="Children's Privacy">
            <p>
              The Service is not directed at children under the age of 13. We do
              not knowingly collect personal information from children under 13.
              If you believe a child under 13 has provided us with personal
              information, please contact us and we will delete it.
            </p>
          </Section>

          {/* Your Rights */}
          <Section title="Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Access</strong> the personal data we hold about you
              </li>
              <li>
                <strong>Correct</strong> inaccurate personal data
              </li>
              <li>
                <strong>Delete</strong> your account and personal data
                (available directly in the app via Settings)
              </li>
              <li>
                <strong>Export</strong> your data (available directly in the
                app)
              </li>
              <li>
                <strong>Object</strong> to or restrict certain processing of
                your data
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the
              information below.
            </p>

            <SubSection title="California Residents">
              <p>
                Under the California Online Privacy Protection Act (CalOPPA),
                California residents have the right to know what personal
                information is collected and how it is used. This policy
                fulfills that requirement. We do not track users across
                third-party websites, and we do not respond to Do Not Track
                signals because we do not engage in cross-site tracking.
              </p>
            </SubSection>
          </Section>

          {/* Changes to This Policy */}
          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will update the &ldquo;Last updated&rdquo;
              date at the top of this page. Your continued use of the Service
              after changes are posted constitutes your acceptance of the
              updated policy.
            </p>
          </Section>

          {/* Contact */}
          <Section title="Contact">
            <p>
              If you have questions about this Privacy Policy or your personal
              data, you can reach us at:
            </p>
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
