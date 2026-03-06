"use client";

import { useState, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Code,
  Link,
  List,
  Heading2,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Markdown } from "@/components/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

function insertAround(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue =
    value.slice(0, selectionStart) +
    before +
    selected +
    after +
    value.slice(selectionEnd);
  onChange(newValue);
  // Restore cursor after React re-renders
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = selectionStart + before.length;
    textarea.selectionEnd = selectionEnd + before.length;
  });
}

function insertAtLineStart(
  textarea: HTMLTextAreaElement,
  prefix: string,
  onChange: (v: string) => void,
) {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd =
      selectionStart + prefix.length;
  });
}

function insertText(
  textarea: HTMLTextAreaElement,
  text: string,
  onChange: (v: string) => void,
) {
  const { selectionStart, value } = textarea;
  const newValue =
    value.slice(0, selectionStart) + text + value.slice(selectionStart);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd =
      selectionStart + text.length;
  });
}

export function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  placeholder,
  rows = 6,
  required,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (!onImageUpload) return;
      const imageFiles = files.filter(
        (f) =>
          f.type.startsWith("image/") ||
          f.name?.toLowerCase().endsWith(".heic") ||
          f.name?.toLowerCase().endsWith(".heif"),
      );
      if (imageFiles.length === 0) return;

      setUploading(true);
      for (const file of imageFiles) {
        const url = await onImageUpload(file);
        if (url && textareaRef.current) {
          insertText(textareaRef.current, `![image](${url})\n`, onChange);
        }
      }
      setUploading(false);
    },
    [onImageUpload, onChange],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;
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
        await handleImageFiles(files);
      }
    },
    [onImageUpload, handleImageFiles],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;
      const files = Array.from(e.dataTransfer.files).filter(
        (f) =>
          f.type.startsWith("image/") ||
          f.name?.toLowerCase().endsWith(".heic") ||
          f.name?.toLowerCase().endsWith(".heif"),
      );
      if (files.length > 0) {
        e.preventDefault();
        await handleImageFiles(files);
      }
    },
    [onImageUpload, handleImageFiles],
  );

  const handleToolbar = useCallback(
    (action: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      switch (action) {
        case "bold":
          insertAround(ta, "**", "**", onChange);
          break;
        case "italic":
          insertAround(ta, "_", "_", onChange);
          break;
        case "code":
          insertAround(ta, "`", "`", onChange);
          break;
        case "codeblock":
          insertAround(ta, "\n```\n", "\n```\n", onChange);
          break;
        case "link":
          insertAround(ta, "[", "](url)", onChange);
          break;
        case "list":
          insertAtLineStart(ta, "- ", onChange);
          break;
        case "heading":
          insertAtLineStart(ta, "## ", onChange);
          break;
        case "image":
          fileInputRef.current?.click();
          break;
      }
    },
    [onChange],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      await handleImageFiles(files);
      e.target.value = "";
    },
    [handleImageFiles],
  );

  const toolbarButtons = [
    { action: "bold", icon: Bold, title: "Bold (Ctrl+B)" },
    { action: "italic", icon: Italic, title: "Italic (Ctrl+I)" },
    { action: "code", icon: Code, title: "Inline code" },
    { action: "link", icon: Link, title: "Link" },
    { action: "list", icon: List, title: "List" },
    { action: "heading", icon: Heading2, title: "Heading" },
    ...(onImageUpload
      ? [
          {
            action: "image",
            icon: uploading ? Loader2 : ImagePlus,
            title: "Insert image",
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
      {/* Toolbar + mode toggle */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {mode === "write" &&
            toolbarButtons.map((btn) => (
              <button
                key={btn.action}
                type="button"
                title={btn.title}
                onClick={() => handleToolbar(btn.action)}
                disabled={btn.action === "image" && uploading}
                className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50 ${
                  btn.action === "image" && uploading ? "animate-spin" : ""
                }`}
              >
                <btn.icon className="h-4 w-4" />
              </button>
            ))}
        </div>
        <div className="flex rounded-md bg-slate-200 dark:bg-slate-700 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "write"
                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "preview"
                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content area */}
      {mode === "write" ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            placeholder={placeholder}
            rows={rows}
            required={required}
            disabled={uploading}
            className="w-full bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none resize-y font-mono disabled:opacity-60"
          />
          {uploading && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading image...
            </div>
          )}
        </>
      ) : (
        <div
          className="px-3 py-2 text-sm min-h-[100px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          style={{ minHeight: `${rows * 1.5 + 1}rem` }}
        >
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-slate-400 italic">Nothing to preview</p>
          )}
        </div>
      )}

      {/* Hidden file input for image toolbar button */}
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          aria-label="Upload images"
        />
      )}
    </div>
  );
}
