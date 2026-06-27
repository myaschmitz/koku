"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardForm, type CardFormData } from "@/components/card-form";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useModalA11y } from "@/hooks/use-modal-a11y";

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

  const dialogRef = useModalA11y<HTMLDivElement>({
    open,
    trapEnabled: !showDiscard,
    onEscape: () => {
      if (showDiscard) {
        setShowDiscard(false);
      } else {
        tryClose();
      }
    },
  });

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
      .maybeSingle();
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
    if (error) {
      toast.error("Failed to create card");
      return;
    }
    onCreated();
    setDirty(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={tryClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-card-modal-title"
        className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 id="create-card-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            New Card
          </h2>
          <button
            onClick={tryClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
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
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-dialog-title"
            className="relative w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-6"
          >
            <h3 id="discard-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
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
