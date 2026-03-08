"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload-image";
import { getCardTitle } from "@/lib/card-utils";

export interface CardFormData {
  content: string;
}

interface CardFormProps {
  initial?: Partial<CardFormData>;
  onSubmit: (data: CardFormData) => Promise<void>;
  submitLabel: string;
  userId: string;
  cardId?: string;
  checkDuplicate?: (
    title: string,
  ) => Promise<{ id: string; title: string } | null>;
  onDirtyChange?: (dirty: boolean) => void;
}

export function CardForm({
  initial,
  onSubmit,
  submitLabel,
  userId,
  cardId,
  checkDuplicate,
  onDirtyChange,
}: CardFormProps) {
  const [content, setContent] = useState(initial?.content ?? "");

  useEffect(() => {
    const dirty = content.trim() !== "";
    onDirtyChange?.(dirty);
  }, [content, onDirtyChange]);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!checkDuplicate) return;
    const title = getCardTitle(content);
    if (!title || title === "Untitled") {
      setDuplicateWarning(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const match = await checkDuplicate(title);
      setDuplicateWarning(match ? match.title : null);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, checkDuplicate]);

  const [tempId] = useState(() => crypto.randomUUID());
  const storagePath = `${userId}/${cardId ?? tempId}`;

  const supabase = createClient();

  const handleImageUpload = useCallback(
    async (file: File) => {
      return uploadImage(supabase, file, storagePath);
    },
    [supabase, storagePath],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await onSubmit({
      content: content.trim(),
    });
    setSaving(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving && content.trim()) {
        e.preventDefault();
        handleSubmit(new Event("submit") as unknown as React.FormEvent);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Content
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">---</code> on its own line to separate sections. Multiple separators create multiple hidden sections.
        </p>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          onImageUpload={handleImageUpload}
          placeholder={"Front side content...\n\n---\n\nBack side content (optional)"}
          rows={12}
          autoFocus
        />
      </div>

      {duplicateWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          A card titled &ldquo;{duplicateWarning}&rdquo; already exists in this
          deck.
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !content.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-500 dark:bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : submitLabel}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-blue-400/30 px-1.5 py-0.5 text-xs font-mono text-blue-100">
          <span>{typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"}</span>
          <span>↵</span>
        </kbd>
      </button>
    </form>
  );
}
