"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { uploadImage } from "@/lib/upload-image";
import type { CardTemplate } from "@/lib/types";

interface CreateTemplateModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (template: CardTemplate) => void;
}

export function CreateTemplateModal({
  userId,
  open,
  onClose,
  onCreated,
}: CreateTemplateModalProps) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setContent("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  const [tempId] = useState(() => crypto.randomUUID());
  const storagePath = `${userId}/${tempId}`;

  const handleImageUpload = useCallback(
    async (file: File) => {
      return uploadImage(supabase, file, storagePath);
    },
    [supabase, storagePath],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("card_templates")
      .insert({
        user_id: userId,
        name: name.trim(),
        content: content,
        icon: "file",
      })
      .select()
      .single();

    setSaving(false);

    if (!error && data) {
      onCreated(data as CardTemplate);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            New Template
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Template name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diagram card, Cloze deletion..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Template content
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              This will be pre-filled when creating a new card with this
              template. Use{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                ---
              </code>{" "}
              to separate front and back.
            </p>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onImageUpload={handleImageUpload}
              placeholder={"Front side content...\n\n---\n\nBack side content"}
              rows={8}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500/80 dark:bg-blue-500/60 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600/80 dark:hover:bg-blue-400/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Create Template"}
          </button>
        </form>
      </div>
    </div>
  );
}
