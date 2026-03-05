"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Card, Deck } from "@/lib/types";

const STATE_LABELS = ["New", "Learning", "Review", "Relearning"];
const STATE_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
];

export default function DeckDetailPage() {
  const params = useParams();
  const deckId = params.id as string;
  const supabase = createClient();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data: deckData } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .single();

      const { data: cardsData } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: false });

      const now = new Date().toISOString();
      const { count } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", deckId)
        .lte("due", now);

      setDeck(deckData);
      setCards(cardsData ?? []);
      setDueCount(count ?? 0);
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    await supabase.from("cards").delete().eq("id", cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Deck not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/decks"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <ArrowLeft className="inline h-4 w-4" /> Back to decks
          </Link>
          <h1 className="text-2xl font-bold mt-1">{deck.name}</h1>
          {deck.description && (
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {deck.description}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {dueCount > 0 && (
            <Link
              href={`/study/${deckId}`}
              className="rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              Study ({dueCount})
            </Link>
          )}
          <Link
            href={`/cards/new?deck=${deckId}`}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            + New Card
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            No cards in this deck yet.
          </p>
          <Link
            href={`/cards/new?deck=${deckId}`}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            + New Card
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/cards/${card.id}`}
                    className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400"
                  >
                    {card.front_title}
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_COLORS[card.state]}`}
                    >
                      {STATE_LABELS[card.state]}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due: {new Date(card.due).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Link
                    href={`/cards/${card.id}/edit`}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
