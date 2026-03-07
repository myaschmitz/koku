"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PauseCircle, PlayCircle } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { splitCardContent } from "@/lib/card-utils";
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

      setCard(data as Card);
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const handleToggleSuspend = async () => {
    if (!card) return;
    const newSuspended = !card.suspended;
    await supabase
      .from("cards")
      .update({ suspended: newSuspended, updated_at: new Date().toISOString() })
      .eq("id", card.id);
    setCard({ ...card, suspended: newSuspended });
  };

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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleSuspend}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              card.suspended
                ? "border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {card.suspended ? (
              <>
                <PlayCircle className="inline h-4 w-4 mr-1" />
                Unsuspend
              </>
            ) : (
              <>
                <PauseCircle className="inline h-4 w-4 mr-1" />
                Suspend
              </>
            )}
          </button>
          <Link
            href={`/cards/${card.id}/edit`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        {(() => {
          const { front, backs } = splitCardContent(card.content);
          return (
            <>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Front
                </span>
                <div className="mt-2 text-slate-600 dark:text-slate-300">
                  <Markdown>{front}</Markdown>
                </div>
              </div>

              {backs.map((section, i) => (
                <div key={i}>
                  <hr className="border-slate-200 dark:border-slate-700" />
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {backs.length === 1 ? "Back" : `Section ${i + 1}`}
                    </span>
                    <div className="mt-2 text-slate-600 dark:text-slate-300">
                      <Markdown>{section}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </>
          );
        })()}
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        {card.suspended && (
          <span className="rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 text-xs font-medium">
            Suspended
          </span>
        )}
        <span>State: {STATE_LABELS[card.state]}</span>
        <span>Due: {new Date(card.due).toLocaleDateString()}</span>
        <span>Reps: {card.reps}</span>
      </div>
    </div>
  );
}
