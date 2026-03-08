"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { scheduleCard, getSchedulingPreview, Rating } from "@/lib/srs";
import { Markdown } from "@/components/markdown";
import { splitCardContent } from "@/lib/card-utils";

import Link from "next/link";
import { PauseCircle } from "lucide-react";
import type { Grade } from "ts-fsrs";
import type { Card, UserSettings } from "@/lib/types";

interface StudySessionProps {
  cards: Card[];
  settings: UserSettings;
}

interface SessionStats {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export function StudySession({ cards, settings }: StudySessionProps) {
  const supabase = createClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    total: cards.length,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // Undo state: snapshot of previous card's DB fields before rating
  const [undoSnapshot, setUndoSnapshot] = useState<{
    index: number;
    rating: Grade;
    original: Pick<
      Card,
      | "stability"
      | "difficulty"
      | "elapsed_days"
      | "scheduled_days"
      | "reps"
      | "lapses"
      | "state"
      | "due"
      | "last_review"
      | "updated_at"
    >;
  } | null>(null);

  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set());

  const card = cards[currentIndex];

  const handleSuspend = useCallback(async () => {
    if (!card || done) return;

    // Suspend card in DB
    await supabase
      .from("cards")
      .update({ suspended: true, updated_at: new Date().toISOString() })
      .eq("id", card.id);

    setSuspendedIds((prev) => new Set(prev).add(card.id));

    // Skip to next non-suspended card or finish
    let nextIndex = currentIndex + 1;
    while (nextIndex < cards.length && suspendedIds.has(cards[nextIndex].id)) {
      nextIndex++;
    }

    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
      setShowAnswer(false);
    } else {
      setDone(true);
    }
  }, [card, currentIndex, cards, done, supabase, suspendedIds]);

  const handleRate = useCallback(
    async (rating: Grade) => {
      // Save snapshot for undo before modifying
      setUndoSnapshot({
        index: currentIndex,
        rating,
        original: {
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          due: card.due,
          last_review: card.last_review,
          updated_at: card.updated_at,
        },
      });

      const result = scheduleCard(card, rating, settings);
      const updatedCard = result.card;

      // Update card in DB
      await supabase
        .from("cards")
        .update({
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsed_days: updatedCard.elapsed_days,
          scheduled_days: updatedCard.scheduled_days,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          state: updatedCard.state,
          due: updatedCard.due.toISOString(),
          last_review: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);

      // Insert review log
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("review_logs").insert({
          card_id: card.id,
          user_id: user.id,
          rating,
          state: card.state,
          elapsed_days: updatedCard.elapsed_days,
          scheduled_days: updatedCard.scheduled_days,
        });
      }

      // Update stats
      setStats((prev) => {
        if (rating === Rating.Again) return { ...prev, again: prev.again + 1 };
        if (rating === Rating.Hard) return { ...prev, hard: prev.hard + 1 };
        if (rating === Rating.Good) return { ...prev, good: prev.good + 1 };
        return { ...prev, easy: prev.easy + 1 };
      });

      // Next card or done
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        setDone(true);
      }
    },
    [card, currentIndex, cards.length, supabase, settings],
  );

  const handleUndo = useCallback(async () => {
    if (!undoSnapshot) return;

    // Restore the card's original fields in DB
    await supabase
      .from("cards")
      .update({
        stability: undoSnapshot.original.stability,
        difficulty: undoSnapshot.original.difficulty,
        elapsed_days: undoSnapshot.original.elapsed_days,
        scheduled_days: undoSnapshot.original.scheduled_days,
        reps: undoSnapshot.original.reps,
        lapses: undoSnapshot.original.lapses,
        state: undoSnapshot.original.state,
        due: undoSnapshot.original.due,
        last_review: undoSnapshot.original.last_review,
        updated_at: undoSnapshot.original.updated_at,
      })
      .eq("id", cards[undoSnapshot.index].id);

    // Delete the most recent review log for this card
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: logs } = await supabase
        .from("review_logs")
        .select("id")
        .eq("card_id", cards[undoSnapshot.index].id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (logs && logs.length > 0) {
        await supabase.from("review_logs").delete().eq("id", logs[0].id);
      }
    }

    // Revert stats
    const r = undoSnapshot.rating;
    setStats((prev) => {
      if (r === Rating.Again) return { ...prev, again: prev.again - 1 };
      if (r === Rating.Hard) return { ...prev, hard: prev.hard - 1 };
      if (r === Rating.Good) return { ...prev, good: prev.good - 1 };
      return { ...prev, easy: prev.easy - 1 };
    });

    // Go back to that card
    setCurrentIndex(undoSnapshot.index);
    setShowAnswer(false);
    setDone(false);
    setUndoSnapshot(null);
  }, [undoSnapshot, supabase, cards]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (done) return;

      const isFrontOnly = splitCardContent(card.content).backs.length === 0;
      const revealed = isFrontOnly || showAnswer;

      if (!revealed) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        if (e.key === "1") handleRate(Rating.Again);
        else if (e.key === "2") handleRate(Rating.Hard);
        else if (e.key === "3") handleRate(Rating.Good);
        else if (e.key === "4") handleRate(Rating.Easy);
      }

      if (e.key === "u" || e.key === "U") {
        handleUndo();
      }

      if (e.key === "s" || e.key === "S") {
        handleSuspend();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, done, card, handleRate, handleUndo, handleSuspend]);

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <p className="text-lg font-medium mb-4">
            {stats.total - suspendedIds.size} cards reviewed
            {suspendedIds.size > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({suspendedIds.size} suspended)
              </span>
            )}
          </p>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-red-500 font-semibold text-lg">
                {stats.again}
              </p>
              <p className="text-slate-500 dark:text-slate-400">Again</p>
            </div>
            <div>
              <p className="text-orange-500 font-semibold text-lg">
                {stats.hard}
              </p>
              <p className="text-slate-500 dark:text-slate-400">Hard</p>
            </div>
            <div>
              <p className="text-green-500 font-semibold text-lg">
                {stats.good}
              </p>
              <p className="text-slate-500 dark:text-slate-400">Good</p>
            </div>
            <div>
              <p className="text-blue-500 font-semibold text-lg">
                {stats.easy}
              </p>
              <p className="text-slate-500 dark:text-slate-400">Easy</p>
            </div>
          </div>
        </div>
        <Link
          href="/decks"
          className="inline-block rounded-lg bg-blue-500/80 dark:bg-blue-500/60 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600/80 dark:hover:bg-blue-400/60 transition-colors"
        >
          Back to Decks
        </Link>
      </div>
    );
  }

  const activeCount = cards.length - suspendedIds.size;
  // Find the position among non-suspended cards
  let activeIndex = 0;
  for (let i = 0; i < currentIndex; i++) {
    if (!suspendedIds.has(cards[i].id)) activeIndex++;
  }

  const preview = getSchedulingPreview(card, settings);

  const ratingButtons: Array<{
    rating: Grade;
    label: string;
    shortcut: string;
    interval: string;
    color: string;
  }> = [
    {
      rating: Rating.Again,
      label: "Again",
      shortcut: "1",
      interval: preview[Rating.Again],
      color:
        "bg-red-500/80 hover:bg-red-600/80 dark:bg-red-500/60 dark:hover:bg-red-400/60",
    },
    {
      rating: Rating.Hard,
      label: "Hard",
      shortcut: "2",
      interval: preview[Rating.Hard],
      color:
        "bg-orange-500/80 hover:bg-orange-600/80 dark:bg-orange-500/60 dark:hover:bg-orange-400/60",
    },
    {
      rating: Rating.Good,
      label: "Good",
      shortcut: "3",
      interval: preview[Rating.Good],
      color:
        "bg-green-500/80 hover:bg-green-600/80 dark:bg-green-500/60 dark:hover:bg-green-400/60",
    },
    {
      rating: Rating.Easy,
      label: "Easy",
      shortcut: "4",
      interval: preview[Rating.Easy],
      color:
        "bg-blue-500/80 hover:bg-blue-600/80 dark:bg-blue-500/60 dark:hover:bg-blue-400/60",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Card {activeIndex + 1} of {activeCount}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSuspend}
            className="flex items-center gap-1 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            title="Suspend card (S)"
          >
            <PauseCircle className="h-4 w-4" />
            <span>Suspend</span>
            <span className="ml-0.5 inline-flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5 text-[10px] font-mono leading-none">
              S
            </span>
          </button>
          <Link
            href="/decks"
            className="hover:text-slate-700 dark:hover:text-slate-300"
          >
            End session
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500/80 transition-all duration-300"
          style={{
            width: `${activeCount > 0 ? (activeIndex / activeCount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Card */}
      {(() => {
        const { front, backs } = splitCardContent(card.content);
        const isFrontOnly = backs.length === 0;
        const revealed = isFrontOnly || showAnswer;

        return (
          <>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 min-h-[300px] flex flex-col">
              {/* Front */}
              <div className="flex-1">
                {!isFrontOnly && (
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Front
                  </span>
                )}
                <div
                  className={`${isFrontOnly ? "" : "mt-2"} text-slate-600 dark:text-slate-300`}
                >
                  <Markdown>{front}</Markdown>
                </div>
              </div>

              {/* Back sections (revealed) */}
              {revealed &&
                backs.map((section, i) => (
                  <div key={i}>
                    <hr className="border-slate-200 dark:border-slate-700 my-4" />
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
            </div>

            {/* Actions */}
            {!revealed ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 py-3 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
              >
                Show Answer
                <span className="ml-2 text-xs opacity-60 rounded bg-slate-500 dark:bg-slate-400 px-1 py-0.5">
                  Space
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {ratingButtons.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => handleRate(btn.rating)}
                    className={`rounded-lg py-3 text-white text-sm font-medium transition-colors ${btn.color}`}
                  >
                    <div>
                      {btn.label}
                      <span className="ml-1.5 inline-flex items-center justify-center rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono leading-none">
                        {btn.shortcut}
                      </span>
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {btn.interval}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* Undo */}
      {undoSnapshot && (
        <button
          onClick={handleUndo}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Undo last rating{" "}
          <span className="ml-0.5 inline-flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5 text-[10px] font-mono leading-none">U</span>
        </button>
      )}
    </div>
  );
}
