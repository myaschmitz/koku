"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function NavHeader() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/decks"
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
            href="/settings"
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
