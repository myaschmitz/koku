import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Code,
  Moon,
  WifiOff,
  Keyboard,
  Palette,
  Upload,
  Download,
  Pause,
  ImageIcon,
  LayoutGrid,
  Brain,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/decks");
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <Image
              src="/koku-circle-logo.svg"
              alt=""
              width={28}
              height={28}
              className="dark:invert"
            />
            Koku
          </span>
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

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Study smarter,
          <br />
          not harder
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Koku is a flashcard app built for developers and power learners.
          Spaced repetition, Markdown support, offline mode, and more — all free.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-6 py-3 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
        >
          Get started for free
        </Link>
      </section>

      {/* Core Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-10">
          Everything you need to learn effectively
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Brain className="h-5 w-5 text-accent-500" />}
            title="FSRS spaced repetition"
            description="Cards surface right before you forget them, using the modern FSRS algorithm for optimal retention."
          />
          <FeatureCard
            icon={<Code className="h-5 w-5 text-accent-500" />}
            title="Markdown & syntax highlighting"
            description="Write cards in Markdown with syntax-highlighted code blocks. Perfect for studying programming concepts."
          />
          <FeatureCard
            icon={<WifiOff className="h-5 w-5 text-accent-500" />}
            title="Offline mode"
            description="Study anywhere without internet. Your reviews queue locally and sync automatically when you're back online."
          />
          <FeatureCard
            icon={<Keyboard className="h-5 w-5 text-accent-500" />}
            title="Keyboard shortcuts"
            description="Rate cards with 1-4, reveal with Space, undo with U, and more. Study without touching your mouse."
          />
          <FeatureCard
            icon={<ImageIcon className="h-5 w-5 text-accent-500" />}
            title="Image support"
            description="Add images to your cards with drag-and-drop. Mobile photos are automatically converted for the web."
          />
          <FeatureCard
            icon={<LayoutGrid className="h-5 w-5 text-accent-500" />}
            title="Card templates"
            description="Create reusable templates for consistent card formatting, or start from scratch every time."
          />
        </div>
      </section>

      {/* Customization */}
      <section className="border-y border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-3">
            Make it yours
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-10 max-w-lg mx-auto">
            Customize your study environment to match how you like to work.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Moon className="h-5 w-5 text-accent-500" />}
              title="Light & dark themes"
              description="Switch between light and dark mode, or follow your system preference automatically."
            />
            <FeatureCard
              icon={<Palette className="h-5 w-5 text-accent-500" />}
              title="Accent colors & fonts"
              description="Pick from 10 accent colors or set a custom hex. Adjust font size and family to your liking."
            />
            <FeatureCard
              icon={<BookOpen className="h-5 w-5 text-accent-500" />}
              title="Tunable SRS settings"
              description="Control max new cards per day and fine-tune intervals to match your learning pace."
            />
          </div>
        </div>
      </section>

      {/* Data & Portability */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-3">
          Your data, your way
        </h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-10 max-w-lg mx-auto">
          No vendor lock-in. Import from Anki or export your decks anytime.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Upload className="h-5 w-5 text-accent-500" />}
            title="Import from Anki"
            description="Bring your existing Anki decks into Koku with .apkg file import."
          />
          <FeatureCard
            icon={<Download className="h-5 w-5 text-accent-500" />}
            title="Export anywhere"
            description="Export to Anki (.apkg), CSV, or JSON. Take your cards wherever you go."
          />
          <FeatureCard
            icon={<Pause className="h-5 w-5 text-accent-500" />}
            title="Vacation mode"
            description="Going on a break? Pause all reviews and pick up right where you left off — no pile-up."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ready to start learning?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Free and open to use. No credit card required.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-6 py-3 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8">
        <div className="flex items-center justify-center gap-4 text-sm text-slate-400 dark:text-slate-500">
          <span>&copy; {new Date().getFullYear()} Koku</span>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Privacy
          </Link>
          <span>&middot;</span>
          <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
