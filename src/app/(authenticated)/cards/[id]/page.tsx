"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { linkifyText } from "@/lib/linkify";
import type { Card } from "@/lib/types";

const STATE_LABELS = ["New", "Learning", "Review", "Relearning"];

export default function CardViewPage() {
  const params = useParams();
  const cardId = params.id as string;
  const supabase = createClient();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("id", cardId)
        .single();
      setCard(data);
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Card not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/decks/${card.deck_id}`}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="inline h-4 w-4" /> Back to deck
        </Link>
        <Link
          href={`/cards/${card.id}/edit`}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Front
          </span>
          <h2 className="text-xl font-semibold mt-1">{card.front_title}</h2>
          {card.front_detail && (
            <p className="mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {linkifyText(card.front_detail)}
            </p>
          )}
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Back
          </span>
          <p className="mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {linkifyText(card.back_content)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>State: {STATE_LABELS[card.state]}</span>
        <span>Due: {new Date(card.due).toLocaleDateString()}</span>
        <span>Reps: {card.reps}</span>
      </div>
    </div>
  );
}
