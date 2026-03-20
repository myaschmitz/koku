"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import type { Deck } from "@/lib/types";

interface BulkCardActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetDeckId: string) => void;
  currentDeckId: string;
  userId: string;
  cardCount: number;
  action: "move" | "duplicate";
  loading?: boolean;
}

export function BulkCardActionModal({
  open,
  onClose,
  onConfirm,
  currentDeckId,
  userId,
  cardCount,
  action,
  loading,
}: BulkCardActionModalProps) {
  const supabase = createClient();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [targetDeckId, setTargetDeckId] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchDecks = async () => {
      const { data } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (data) {
        setDecks(data);
        const options =
          action === "move"
            ? data.filter((d) => d.id !== currentDeckId)
            : data;
        if (options.length > 0) {
          setTargetDeckId(options[0].id);
        }
      }
    };
    fetchDecks();
  }, [open, userId, supabase, action, currentDeckId]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, scrollY);
      };
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const filteredDecks =
    action === "move"
      ? decks.filter((d) => d.id !== currentDeckId)
      : decks;

  const title =
    action === "move"
      ? `Move ${cardCount} Card${cardCount === 1 ? "" : "s"}`
      : `Duplicate ${cardCount} Card${cardCount === 1 ? "" : "s"}`;

  const confirmLabel =
    action === "move"
      ? `Move Card${cardCount === 1 ? "" : "s"}`
      : `Duplicate Card${cardCount === 1 ? "" : "s"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-action-modal-title"
        className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2
            id="bulk-action-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="bulk-action-deck-select"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Destination Deck
            </label>
            {filteredDecks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No other decks available.{" "}
                {action === "move" && "Create another deck first."}
              </p>
            ) : (
              <select
                id="bulk-action-deck-select"
                value={targetDeckId}
                onChange={(e) => setTargetDeckId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              >
                {filteredDecks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                    {deck.id === currentDeckId ? " (current)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(targetDeckId)}
              disabled={loading || filteredDecks.length === 0 || !targetDeckId}
              className="flex-1 rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Working..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
