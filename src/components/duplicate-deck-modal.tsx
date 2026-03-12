"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { toast } from "sonner";
import { duplicateCardImages } from "@/lib/duplicate-utils";
import type { Deck } from "@/lib/types";

interface DuplicateDeckModalProps {
  deck: Deck | null;
  open: boolean;
  onClose: () => void;
  onDuplicated?: () => void;
}

export function DuplicateDeckModal({
  deck,
  open,
  onClose,
  onDuplicated,
}: DuplicateDeckModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (open && deck) {
      setName(`Copy of ${deck.name}`);
      setDescription(deck.description ?? "");
    }
  }, [open, deck]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !duplicating) onClose();
    },
    [onClose, duplicating],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck || !name.trim() || duplicating) return;

    setDuplicating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Create the new deck
      const { data: newDeck, error: deckError } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select("id")
        .single();

      if (deckError || !newDeck) {
        toast.error("Failed to create deck");
        return;
      }

      // Fetch all cards from the source deck
      const { data: sourceCards } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deck.id);

      if (sourceCards && sourceCards.length > 0) {
        // Duplicate cards in batches of 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < sourceCards.length; i += BATCH_SIZE) {
          const batch = sourceCards.slice(i, i + BATCH_SIZE);

          const newCards = await Promise.all(
            batch.map(async (card) => {
              const newCardId = crypto.randomUUID();
              const newStoragePath = `${user.id}/${newCardId}`;

              const updatedContent = await duplicateCardImages(
                supabase,
                card.content,
                newStoragePath,
              );

              return {
                id: newCardId,
                deck_id: newDeck.id,
                user_id: user.id,
                content: updatedContent,
              };
            }),
          );

          await supabase.from("cards").insert(newCards);
        }
      }

      const cardCount = sourceCards?.length ?? 0;
      toast.success(
        `Deck duplicated with ${cardCount} ${cardCount === 1 ? "card" : "cards"}`,
      );
      onDuplicated?.();
      onClose();
      router.push(`/decks/${newDeck.id}`);
    } catch {
      toast.error("Failed to duplicate deck");
    } finally {
      setDuplicating(false);
    }
  };

  if (!open || !deck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div
        className="fixed inset-0"
        onClick={duplicating ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-deck-modal-title"
        className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2
            id="duplicate-deck-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Duplicate Deck
          </h2>
          <button
            onClick={onClose}
            disabled={duplicating}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="duplicate-deck-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Deck Name
            </label>
            <input
              id="duplicate-deck-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={duplicating}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="duplicate-deck-desc"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Description (optional)
            </label>
            <input
              id="duplicate-deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={duplicating}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            All cards and their images will be duplicated. New cards will start
            with fresh study progress.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={duplicating || !name.trim()}
              className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {duplicating ? "Duplicating..." : "Duplicate Deck"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={duplicating}
              className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
