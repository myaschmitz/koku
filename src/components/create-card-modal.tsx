"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardForm, type CardFormData } from "@/components/card-form";
import { X, Check } from "lucide-react";

interface CreateCardModalProps {
  deckId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateCardModal({
  deckId,
  userId,
  open,
  onClose,
  onCreated,
}: CreateCardModalProps) {
  const supabase = createClient();
  const [formKey, setFormKey] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

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
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  const checkDuplicate = async (title: string) => {
    const normalized = title.replace(/^\d+[\.\-\s]+\s*/, "").trim();
    if (!normalized) return null;
    const escaped = normalized.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data } = await supabase
      .from("cards")
      .select("id, front_title")
      .eq("deck_id", deckId)
      .ilike("front_title", `%${escaped}%`)
      .limit(1)
      .single();
    return data ?? null;
  };

  const handleSubmit = async (data: CardFormData) => {
    const { data: card, error } = await supabase
      .from("cards")
      .insert({
        deck_id: deckId,
        user_id: userId,
        front_title: data.front_title,
        front_detail: data.front_detail || null,
        back_content: data.back_content,
      })
      .select("id")
      .single();

    if (!error && card && data.tags.length > 0) {
      await supabase
        .from("card_tags")
        .insert(data.tags.map((tag) => ({ card_id: card.id, tag_id: tag.id })));
    }

    if (!error) {
      onCreated();
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setFormKey((k) => k + 1);
      }, 800);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            New Card
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
          {showSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4" />
              Card created! Add another below.
            </div>
          )}
          <CardForm
            key={formKey}
            onSubmit={handleSubmit}
            submitLabel="Create Card"
            userId={userId}
            checkDuplicate={checkDuplicate}
          />
        </div>
      </div>
    </div>
  );
}
