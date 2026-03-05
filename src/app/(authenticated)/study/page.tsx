"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudySession } from "@/components/study-session";
import type { Card, UserSettings } from "@/lib/types";

export default function StudyAllPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const { data: cardsData } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .lte("due", now)
        .order("state", { ascending: true })
        .order("due", { ascending: true });

      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setCards(cardsData ?? []);
      setSettings(
        settingsData ?? {
          user_id: user.id,
          again_interval_hours: 24,
          hard_interval_hours: 72,
          max_new_cards_per_day: 20,
          theme: "system",
          created_at: "",
          updated_at: "",
        }
      );
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">No cards due!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          All caught up. Check back later.
        </p>
        <Link
          href="/decks"
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          <ArrowLeft className="inline h-4 w-4" /> Back to decks
        </Link>
      </div>
    );
  }

  return <StudySession cards={cards} settings={settings!} />;
}
