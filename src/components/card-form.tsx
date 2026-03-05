"use client";

import { useState } from "react";

interface CardFormData {
  front_title: string;
  front_detail: string;
  back_content: string;
}

interface CardFormProps {
  initial?: CardFormData;
  onSubmit: (data: CardFormData) => Promise<void>;
  submitLabel: string;
}

export function CardForm({ initial, onSubmit, submitLabel }: CardFormProps) {
  const [frontTitle, setFrontTitle] = useState(initial?.front_title ?? "");
  const [frontDetail, setFrontDetail] = useState(initial?.front_detail ?? "");
  const [backContent, setBackContent] = useState(initial?.back_content ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontTitle.trim() || !backContent.trim()) return;
    setSaving(true);
    await onSubmit({
      front_title: frontTitle.trim(),
      front_detail: frontDetail.trim(),
      back_content: backContent.trim(),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Front</h2>
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
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Back</h2>
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
      </div>

      <button
        type="submit"
        disabled={saving || !frontTitle.trim() || !backContent.trim()}
        className="rounded-lg bg-blue-500 dark:bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
