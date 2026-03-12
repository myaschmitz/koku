"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardForm, type CardFormData } from "@/components/card-form";
import { X } from "lucide-react";
import { toast } from "sonner";
import { duplicateCardImages } from "@/lib/duplicate-utils";
import type { Card, Deck } from "@/lib/types";

interface DuplicateCardModalProps {
  card: Card | null;
  currentDeckId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onDuplicated: () => void;
}

export function DuplicateCardModal({
  card,
  currentDeckId,
  userId,
  open,
  onClose,
  onDuplicated,
}: DuplicateCardModalProps) {
  const supabase = createClient();
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [targetDeckId, setTargetDeckId] = useState(currentDeckId);

  // Reset target deck when modal opens with a new card
  useEffect(() => {
    if (open) {
      setTargetDeckId(currentDeckId);
      setFormKey((k) => k + 1);
    }
  }, [open, currentDeckId]);

  // Fetch user's decks for the deck selector
  useEffect(() => {
    if (!open) return;
    const fetchDecks = async () => {
      const { data } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (data) setDecks(data);
    };
    fetchDecks();
  }, [open, userId, supabase]);

  const tryClose = useCallback(() => {
    if (dirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscard(false);
    setFormKey((k) => k + 1);
    setDirty(false);
    onClose();
  }, [onClose]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDiscard) {
          setShowDiscard(false);
        } else {
          tryClose();
        }
      }
    },
    [tryClose, showDiscard],
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

  const handleSubmit = async (data: CardFormData) => {
    const newCardId = crypto.randomUUID();
    const newStoragePath = `${userId}/${newCardId}`;

    // Duplicate images and update content paths
    const updatedContent = await duplicateCardImages(
      supabase,
      data.content,
      newStoragePath,
    );

    const { error } = await supabase.from("cards").insert({
      id: newCardId,
      deck_id: targetDeckId,
      user_id: userId,
      content: updatedContent,
    });

    if (error) {
      toast.error("Failed to duplicate card");
      return;
    }

    toast.success("Card duplicated");
    setDirty(false);
    onDuplicated();
    onClose();
  };

  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={tryClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-card-modal-title"
        className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2
            id="duplicate-card-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Duplicate Card
          </h2>
          <button
            onClick={tryClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[80vh] overflow-y-auto space-y-4">
          <div>
            <label
              htmlFor="duplicate-card-deck-select"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Destination Deck
            </label>
            <select
              id="duplicate-card-deck-select"
              value={targetDeckId}
              onChange={(e) => setTargetDeckId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                  {deck.id === currentDeckId ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <CardForm
            key={formKey}
            initial={{ content: card.content }}
            onSubmit={handleSubmit}
            submitLabel="Duplicate Card"
            userId={userId}
            onDirtyChange={setDirty}
          />
        </div>
      </div>

      {showDiscard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div
            className="fixed inset-0"
            onClick={() => setShowDiscard(false)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-dialog-title"
            className="relative w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-6"
          >
            <h3
              id="discard-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2"
            >
              Discard changes?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmDiscard}
                className="w-full rounded-lg border border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Close and discard
              </button>
              <button
                type="button"
                onClick={() => setShowDiscard(false)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
