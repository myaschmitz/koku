"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { scheduleCard, getSchedulingPreview, Rating } from "@/lib/srs";
import { linkifyText } from "@/lib/linkify";
import { ImageGrid } from "@/components/image-grid";
import Link from "next/link";
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

  const card = cards[currentIndex];

  const handleRate = async (rating: Grade) => {
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
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <p className="text-lg font-medium mb-4">
            {stats.total} cards reviewed
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
          className="cursor-pointer inline-block rounded-lg bg-blue-500 dark:bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
        >
          Back to Decks
        </Link>
      </div>
    );
  }

  const preview = getSchedulingPreview(card, settings);

  const ratingButtons: Array<{ rating: Grade; label: string; interval: string; color: string }> = [
    {
      rating: Rating.Again,
      label: "Again",
      interval: preview[Rating.Again],
      color:
        "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500",
    },
    {
      rating: Rating.Hard,
      label: "Hard",
      interval: preview[Rating.Hard],
      color:
        "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500",
    },
    {
      rating: Rating.Good,
      label: "Good",
      interval: preview[Rating.Good],
      color:
        "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500",
    },
    {
      rating: Rating.Easy,
      label: "Easy",
      interval: preview[Rating.Easy],
      color:
        "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Card {currentIndex + 1} of {cards.length}
        </span>
        <Link
          href="/decks"
          className="hover:text-slate-700 dark:hover:text-slate-300"
        >
          End session
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${((currentIndex) / cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 min-h-[300px] flex flex-col">
        {/* Front */}
        <div className="flex-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Front
          </span>
          <h2 className="text-xl font-semibold mt-2">{card.front_title}</h2>
          {card.front_detail && (
            <p className="mt-3 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {linkifyText(card.front_detail)}
            </p>
          )}
          <ImageGrid images={card.front_images ?? []} />
        </div>

        {/* Back (revealed) */}
        {showAnswer && (
          <>
            <hr className="border-slate-200 dark:border-slate-700 my-4" />
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Back
              </span>
              <p className="mt-2 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {linkifyText(card.back_content)}
              </p>
              <ImageGrid images={card.back_images ?? []} />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="cursor-pointer w-full rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 py-3 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
        >
          Show Answer
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {ratingButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleRate(btn.rating)}
              className={`cursor-pointer rounded-lg py-3 text-white text-sm font-medium transition-colors ${btn.color}`}
            >
              <div>{btn.label}</div>
              <div className="text-xs opacity-80 mt-0.5">{btn.interval}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
