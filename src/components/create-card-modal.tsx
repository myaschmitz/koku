"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardForm, type CardFormData } from "@/components/card-form";
import { X } from "lucide-react";

interface CreateCardModalProps {
  deckId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialContent?: string;
}

export function CreateCardModal({
  deckId,
  userId,
  open,
  onClose,
  onCreated,
  initialContent = "",
}: CreateCardModalProps) {
  const supabase = createClient();
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

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
      // Prevent background scroll on mobile (iOS Safari ignores overflow:hidden on body)
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

  const checkDuplicate = async (title: string) => {
    const normalized = title.replace(/^\d+[\.\-\s]+\s*/, "").trim();
    if (!normalized) return null;
    const escaped = normalized.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data } = await supabase
      .from("cards")
      .select("id, content")
      .eq("deck_id", deckId)
      .ilike("content", `%${escaped}%`)
      .limit(1)
      .single();
    if (!data) return null;
    const { getCardTitle } = await import("@/lib/card-utils");
    return { id: data.id, title: getCardTitle(data.content) };
  };

  const handleSubmit = async (data: CardFormData) => {
    const { error } = await supabase
      .from("cards")
      .insert({
        deck_id: deckId,
        user_id: userId,
        content: data.content,
      })
    if (!error) {
      onCreated();
      setDirty(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={tryClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            New Card
          </h2>
          <button
            onClick={tryClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
          <CardForm
            key={formKey}
            initial={initialContent ? { content: initialContent } : undefined}
            onSubmit={handleSubmit}
            submitLabel="Create Card"
            userId={userId}
            checkDuplicate={checkDuplicate}
            onDirtyChange={setDirty}
          />
        </div>
      </div>

      {/* Discard confirmation dialog */}
      {showDiscard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div
            className="fixed inset-0"
            onClick={() => setShowDiscard(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
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
