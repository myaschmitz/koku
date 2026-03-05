"use client";

import { useState, useRef, useCallback } from "react";
import { Bold, Italic, Code, Link, List, Heading2 } from "lucide-react";
import { Markdown } from "@/components/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

function insertAround(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue =
    value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
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
  onChange: (v: string) => void
) {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length;
  });
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  required,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      }
    },
    [onChange]
  );

  const toolbarButtons = [
    { action: "bold", icon: Bold, title: "Bold (Ctrl+B)" },
    { action: "italic", icon: Italic, title: "Italic (Ctrl+I)" },
    { action: "code", icon: Code, title: "Inline code" },
    { action: "link", icon: Link, title: "Link" },
    { action: "list", icon: List, title: "List" },
    { action: "heading", icon: Heading2, title: "Heading" },
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
                className="cursor-pointer p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <btn.icon className="h-4 w-4" />
              </button>
            ))}
        </div>
        <div className="flex rounded-md bg-slate-200 dark:bg-slate-700 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`cursor-pointer px-2.5 py-1 rounded transition-colors ${
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
            className={`cursor-pointer px-2.5 py-1 rounded transition-colors ${
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className="w-full bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none resize-y font-mono"
        />
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
    </div>
  );
}
