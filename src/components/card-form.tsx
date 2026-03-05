"use client";

import { useState, useCallback, useRef } from "react";
import { ImageUpload, type ImageUploadHandle } from "@/components/image-upload";
import { TagInput } from "@/components/tag-input";
import type { Tag } from "@/lib/types";

export interface CardFormData {
  front_title: string;
  front_detail: string;
  back_content: string;
  front_images: string[];
  back_images: string[];
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
  const [frontImages, setFrontImages] = useState<string[]>(initial?.front_images ?? []);
  const [backImages, setBackImages] = useState<string[]>(initial?.back_images ?? []);
  const [tags, setTags] = useState<Tag[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"front" | "back">("front");

  const uploadRef = useRef<ImageUploadHandle>(null);

  const [tempId] = useState(() => crypto.randomUUID());
  const storagePath = `${userId}/${cardId ?? tempId}`;

  const handleFormPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/") || item.type === "") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await uploadRef.current?.processFiles(files);
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontTitle.trim() || !backContent.trim()) return;
    setSaving(true);
    await onSubmit({
      front_title: frontTitle.trim(),
      front_detail: frontDetail.trim(),
      back_content: backContent.trim(),
      front_images: frontImages,
      back_images: backImages,
      tags,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handleFormPaste} className="space-y-6">
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
          {frontImages.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
              {frontImages.length}
            </span>
          )}
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
          {backImages.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
              {backImages.length}
            </span>
          )}
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
            <textarea
              value={frontDetail}
              onChange={(e) => setFrontDetail(e.target.value)}
              placeholder="Problem description, constraints, hints..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>
          <ImageUpload
            ref={uploadRef}
            images={frontImages}
            onChange={setFrontImages}
            userId={userId}
            storagePath={storagePath}
          />
        </div>
      )}

      {/* Back tab */}
      {activeTab === "back" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={backContent}
              onChange={(e) => setBackContent(e.target.value)}
              placeholder="Solution approach, key intuition, code pattern..."
              rows={8}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              required
            />
          </div>
          <ImageUpload
            ref={uploadRef}
            images={backImages}
            onChange={setBackImages}
            userId={userId}
            storagePath={storagePath}
          />
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
