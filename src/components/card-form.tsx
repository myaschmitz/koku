"use client";

import { useState, useCallback } from "react";
import { TagInput } from "@/components/tag-input";
import { MarkdownEditor } from "@/components/markdown-editor";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload-image";
import type { Tag } from "@/lib/types";

export interface CardFormData {
  front_title: string;
  front_detail: string;
  back_content: string;
  tags: Tag[];
}

interface CardFormProps {
  initial?: Partial<CardFormData>;
  onSubmit: (data: CardFormData) => Promise<void>;
  submitLabel: string;
  userId: string;
  cardId?: string;
}

export function CardForm({ initial, onSubmit, submitLabel, userId, cardId }: CardFormProps) {
  const [frontTitle, setFrontTitle] = useState(initial?.front_title ?? "");
  const [frontDetail, setFrontDetail] = useState(initial?.front_detail ?? "");
  const [backContent, setBackContent] = useState(initial?.back_content ?? "");
  const [tags, setTags] = useState<Tag[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"front" | "back">("front");

  const [tempId] = useState(() => crypto.randomUUID());
  const storagePath = `${userId}/${cardId ?? tempId}`;

  const supabase = createClient();

  const handleImageUpload = useCallback(
    async (file: File) => {
      return uploadImage(supabase, file, storagePath);
    },
    [supabase, storagePath]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontTitle.trim() || !backContent.trim()) return;
    setSaving(true);
    await onSubmit({
      front_title: frontTitle.trim(),
      front_detail: frontDetail.trim(),
      back_content: backContent.trim(),
      tags,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="grid grid-cols-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("front")}
          className={`cursor-pointer rounded-md py-3 text-base font-semibold transition-colors ${
            activeTab === "front"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("back")}
          className={`cursor-pointer rounded-md py-3 text-base font-semibold transition-colors ${
            activeTab === "back"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Back
        </button>
      </div>

      {/* Front tab */}
      {activeTab === "front" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={frontTitle}
              onChange={(e) => setFrontTitle(e.target.value)}
              placeholder="e.g., Two Sum"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Detail (optional)
            </label>
            <MarkdownEditor
              value={frontDetail}
              onChange={setFrontDetail}
              onImageUpload={handleImageUpload}
              placeholder="Problem description, constraints, hints... (supports Markdown)"
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Back tab */}
      {activeTab === "back" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <MarkdownEditor
              value={backContent}
              onChange={setBackContent}
              onImageUpload={handleImageUpload}
              placeholder="Solution approach, key intuition, code pattern... (supports Markdown)"
              rows={8}
              required
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <TagInput selectedTags={tags} onChange={setTags} userId={userId} />

      <button
        type="submit"
        disabled={saving || !frontTitle.trim() || !backContent.trim()}
        className="cursor-pointer rounded-lg bg-blue-500 dark:bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
