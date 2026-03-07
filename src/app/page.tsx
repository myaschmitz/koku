import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Code, Moon } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/decks");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
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
          <Link
            href="/login"
            className="rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Remember everything
          <br />
          you learn
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Koku uses spaced repetition to help you master any subject — one
          flashcard at a time.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-blue-500 dark:bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
        >
          Get started — it&apos;s free
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <BookOpen className="h-5 w-5 text-blue-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Spaced repetition
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cards appear right when you&apos;re about to forget, powered by
              the FSRS algorithm.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <Code className="h-5 w-5 text-blue-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Markdown &amp; code
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Write cards in Markdown with syntax-highlighted code blocks — perfect
              for developers.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <Moon className="h-5 w-5 text-blue-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Dark mode
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Study comfortably day or night with full light and dark theme
              support.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-8">
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Koku
        </p>
      </footer>
    </div>
  );
}
