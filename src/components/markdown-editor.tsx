"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  List,
  Heading2,
  ImagePlus,
  Loader2,
  Undo2,
  Redo2,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import TurndownService from "turndown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  autoFocus?: boolean;
}

function wrapSelection(
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
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = selectionStart + before.length;
    textarea.selectionEnd = selectionEnd + before.length;
  });
}

/**
 * Find a balanced pair of symmetric markers (like ** or ~~) surrounding
 * the cursor on the current line.  Returns [openIdx, closeIdx] where
 * openIdx is the start of the opening marker and closeIdx is the start
 * of the closing marker, or null if no enclosing pair is found.
 */
function findEnclosingMarkers(
  value: string,
  cursor: number,
  marker: string,
): [number, number] | null {
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const lineEndRaw = value.indexOf("\n", cursor);
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const line = value.slice(lineStart, lineEnd);
  const cur = cursor - lineStart;

  // Collect every occurrence of the marker on this line
  const positions: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= line.length - marker.length) {
    const idx = line.indexOf(marker, searchFrom);
    if (idx === -1) break;
    positions.push(idx);
    searchFrom = idx + marker.length;
  }

  // Pair them 1↔2, 3↔4 … and check whether the cursor sits inside a pair
  for (let i = 0; i < positions.length - 1; i += 2) {
    const openEnd = positions[i] + marker.length;
    const closeStart = positions[i + 1];
    if (cur >= openEnd && cur <= closeStart) {
      return [lineStart + positions[i], lineStart + closeStart];
    }
  }
  return null;
}

/**
 * Find an enclosing pair of *different* open/close markers (like <u>…</u>)
 * surrounding the cursor on the current line.
 */
function findEnclosingAsymmetric(
  value: string,
  cursor: number,
  before: string,
  after: string,
): [number, number] | null {
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const lineEndRaw = value.indexOf("\n", cursor);
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const line = value.slice(lineStart, lineEnd);
  const cur = cursor - lineStart;

  // Search backwards from cursor for `before`, forwards for `after`
  const openIdx = line.lastIndexOf(before, cur - 1);
  if (openIdx === -1) return null;
  const closeIdx = line.indexOf(after, cur);
  if (closeIdx === -1) return null;
  if (cur >= openIdx + before.length && cur <= closeIdx) {
    return [lineStart + openIdx, lineStart + closeIdx];
  }
  return null;
}

/**
 * Toggle symmetric or asymmetric inline markers (bold, italic, code, etc.).
 * Handles three scenarios similar to Obsidian:
 *   1. Text selected & already wrapped → unwrap
 *   2. No selection, cursor inside markers → remove markers
 *   3. Otherwise → wrap / insert markers
 */
function toggleAround(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;

  // --- 1. Check if markers sit immediately outside the selection / cursor ---
  const prefixStart = selectionStart - before.length;
  const suffixEnd = selectionEnd + after.length;
  if (
    prefixStart >= 0 &&
    suffixEnd <= value.length &&
    value.slice(prefixStart, selectionStart) === before &&
    value.slice(selectionEnd, suffixEnd) === after
  ) {
    const inner = value.slice(selectionStart, selectionEnd);
    const newValue =
      value.slice(0, prefixStart) + inner + value.slice(suffixEnd);
    onChange(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = prefixStart;
      textarea.selectionEnd = prefixStart + inner.length;
    });
    return;
  }

  // --- 2. Selected text itself contains markers at its edges ---
  if (selectionStart !== selectionEnd) {
    const selected = value.slice(selectionStart, selectionEnd);
    if (
      selected.length >= before.length + after.length &&
      selected.startsWith(before) &&
      selected.endsWith(after)
    ) {
      const inner = selected.slice(
        before.length,
        selected.length - after.length,
      );
      const newValue =
        value.slice(0, selectionStart) + inner + value.slice(selectionEnd);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionStart + inner.length;
      });
      return;
    }
  }

  // --- 3. No selection – look for an enclosing marker pair on the same line ---
  if (selectionStart === selectionEnd) {
    const pair =
      before === after
        ? findEnclosingMarkers(value, selectionStart, before)
        : findEnclosingAsymmetric(value, selectionStart, before, after);

    if (pair) {
      const [openIdx, closeIdx] = pair;
      const inner = value.slice(openIdx + before.length, closeIdx);
      const newValue =
        value.slice(0, openIdx) +
        inner +
        value.slice(closeIdx + after.length);
      onChange(newValue);
      const newCursor = selectionStart - before.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      });
      return;
    }
  }

  // --- 4. Not currently formatted → wrap ---
  wrapSelection(textarea, before, after, onChange);
}

/**
 * Toggle a markdown link.  When already inside `[text](url)`, removes
 * the link syntax and keeps the text.  Otherwise wraps with link markers.
 */
function toggleLink(
  textarea: HTMLTextAreaElement,
  onChange: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;

  // Check if markers immediately surround the selection: [selection](…)
  if (selectionStart > 0 && value[selectionStart - 1] === "[") {
    const afterSel = value.slice(selectionEnd);
    const m = afterSel.match(/^\]\([^)]*\)/);
    if (m) {
      const text = value.slice(selectionStart, selectionEnd);
      const newValue =
        value.slice(0, selectionStart - 1) +
        text +
        value.slice(selectionEnd + m[0].length);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = selectionStart - 1;
        textarea.selectionEnd = selectionStart - 1 + text.length;
      });
      return;
    }
  }

  // Cursor / selection inside an existing [text](url) on the same line
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndRaw = value.indexOf("\n", selectionStart);
  const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const line = value.slice(lineStart, lineEnd);
  const linkRe = /\[([^\]]*)\]\([^)]*\)/g;
  let match;
  while ((match = linkRe.exec(line)) !== null) {
    const absStart = lineStart + match.index;
    const absEnd = absStart + match[0].length;
    if (selectionStart >= absStart && selectionEnd <= absEnd) {
      const linkText = match[1];
      const newValue =
        value.slice(0, absStart) + linkText + value.slice(absEnd);
      const newCursor = Math.min(
        selectionStart > absStart + linkText.length
          ? absStart + linkText.length
          : selectionStart,
        absStart + linkText.length,
      );
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      });
      return;
    }
  }

  // Not in a link → wrap
  wrapSelection(textarea, "[", "](url)", onChange);
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
  const { selectionStart, selectionEnd, value } = textarea;
  const newValue =
    value.slice(0, selectionStart) + text + value.slice(selectionEnd);
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
  autoFocus,
}: MarkdownEditorProps) {
  const turndown = useMemo(() => {
    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    td.addRule("listItem", {
      filter: "li",
      replacement(content, node) {
        content = content.replace(/^\n+/, "").replace(/\n+$/, "\n");
        let prefix = "- ";
        const parent = node.parentNode;
        if (parent && parent.nodeName === "OL") {
          const items = Array.from(parent.children);
          const index = items.indexOf(node as Element) + 1;
          prefix = `${index}. `;
        }
        return prefix + content.replace(/\n/g, "\n  ") + "\n";
      },
    });
    return td;
  }, []);

  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shiftHeldRef = useRef(false);

  // ── Undo / Redo history ──
  const [historyState, setHistoryState] = useState({ undoLen: 0, redoLen: 0 });
  const undoStackRef = useRef<{ val: string; cur: number }[]>([]);
  const redoStackRef = useRef<{ val: string; cur: number }[]>([]);
  const isRestoringRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Track the last value we pushed so we don't duplicate entries
  const lastPushedRef = useRef(value);

  const canUndo = historyState.undoLen > 0;
  const canRedo = historyState.redoLen > 0;

  /** Notify React about stack-length changes so toolbar buttons update. */
  const syncHistory = useCallback(() => {
    setHistoryState({
      undoLen: undoStackRef.current.length,
      redoLen: redoStackRef.current.length,
    });
  }, []);

  /** Flush any pending typing snapshot to the undo stack immediately. */
  const flushTyping = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    const cur = textareaRef.current;
    if (lastPushedRef.current !== value) {
      undoStackRef.current.push({
        val: lastPushedRef.current,
        cur: cur?.selectionStart ?? 0,
      });
      lastPushedRef.current = value;
      syncHistory();
    }
  }, [value, syncHistory]);

  /** Save a snapshot before a programmatic mutation (formatting, paste, etc.). */
  const saveBeforeAction = useCallback(() => {
    flushTyping();
    const ta = textareaRef.current;
    // Push the current (pre-action) state
    undoStackRef.current.push({
      val: value,
      cur: ta?.selectionStart ?? 0,
    });
    redoStackRef.current = [];
    syncHistory();
  }, [value, flushTyping, syncHistory]);

  // After a formatting action fires onChange, mark the new value as "pushed"
  // so the next typing debounce doesn't double-record it.
  const justFormattedRef = useRef(false);
  useEffect(() => {
    if (justFormattedRef.current) {
      justFormattedRef.current = false;
      lastPushedRef.current = value;
    }
  }, [value]);

  const undo = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    // Flush unsaved typing so we don't lose intermediate state
    if (lastPushedRef.current !== value) {
      undoStackRef.current.push({
        val: lastPushedRef.current,
        cur: textareaRef.current?.selectionStart ?? 0,
      });
      lastPushedRef.current = value;
    }
    if (undoStackRef.current.length === 0) return;
    const ta = textareaRef.current;
    redoStackRef.current.push({
      val: value,
      cur: ta?.selectionStart ?? 0,
    });
    const entry = undoStackRef.current.pop()!;
    isRestoringRef.current = true;
    lastPushedRef.current = entry.val;
    onChange(entry.val);
    syncHistory();
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = entry.cur;
      }
    });
  }, [value, onChange, syncHistory]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const ta = textareaRef.current;
    undoStackRef.current.push({
      val: value,
      cur: ta?.selectionStart ?? 0,
    });
    const entry = redoStackRef.current.pop()!;
    isRestoringRef.current = true;
    lastPushedRef.current = entry.val;
    onChange(entry.val);
    syncHistory();
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = entry.cur;
      }
    });
  }, [value, onChange, syncHistory]);

  /** Wrap the parent onChange so typing gets debounce-tracked. */
  const trackedOnChange = useCallback(
    (newValue: string) => {
      if (isRestoringRef.current) {
        isRestoringRef.current = false;
        onChange(newValue);
        return;
      }
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (lastPushedRef.current !== newValue) {
          const ta = textareaRef.current;
          undoStackRef.current.push({
            val: lastPushedRef.current,
            cur: ta?.selectionStart ?? 0,
          });
          redoStackRef.current = [];
          lastPushedRef.current = newValue;
          syncHistory();
        }
      }, 500);
      onChange(newValue);
    },
    [onChange, syncHistory],
  );

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
      // Handle image pastes
      if (onImageUpload) {
        const items = e.clipboardData?.items;
        if (items) {
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
            return;
          }
        }
      }

      // Shift+Paste: paste as plain text (default textarea behavior)
      if (shiftHeldRef.current) return;

      // Normal paste: convert HTML to markdown if HTML is available
      const html = e.clipboardData?.getData("text/html");
      if (html) {
        e.preventDefault();
        saveBeforeAction();
        justFormattedRef.current = true;
        const markdown = turndown.turndown(html);
        const ta = textareaRef.current;
        if (ta) {
          insertText(ta, markdown, onChange);
        }
        return;
      }

      // Plain text paste: save undo boundary so paste is its own undo step
      const text = e.clipboardData?.getData("text/plain");
      if (text) {
        e.preventDefault();
        saveBeforeAction();
        justFormattedRef.current = true;
        const ta = textareaRef.current;
        if (ta) {
          insertText(ta, text, onChange);
        }
      }
    },
    [onImageUpload, handleImageFiles, turndown, onChange, saveBeforeAction],
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
      if (action === "undo") {
        undo();
        return;
      }
      if (action === "redo") {
        redo();
        return;
      }
      if (action !== "image") {
        saveBeforeAction();
        justFormattedRef.current = true;
      }
      switch (action) {
        case "bold":
          toggleAround(ta, "**", "**", onChange);
          break;
        case "italic":
          toggleAround(ta, "_", "_", onChange);
          break;
        case "code":
          toggleAround(ta, "`", "`", onChange);
          break;
        case "codeblock":
          wrapSelection(ta, "\n```\n", "\n```\n", onChange);
          break;
        case "underline":
          toggleAround(ta, "<u>", "</u>", onChange);
          break;
        case "strikethrough":
          toggleAround(ta, "~~", "~~", onChange);
          break;
        case "link":
          toggleLink(ta, onChange);
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
    [onChange, saveBeforeAction, undo, redo],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      await handleImageFiles(files);
      e.target.value = "";
    },
    [handleImageFiles],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      shiftHeldRef.current = e.shiftKey;

      // Break undo grouping on Enter so each line is a separate undo step
      if (e.key === "Enter") {
        flushTyping();
      }

      // Auto-complete triple backticks: when user types ` and the two
      // preceding characters are already ``, insert a newline + closing ```
      // and keep the cursor right after the opening ``` (for language tag).
      if (e.key === "`" && !e.metaKey && !e.ctrlKey) {
        const ta = e.currentTarget;
        const { selectionStart, value: val } = ta;
        if (
          selectionStart >= 2 &&
          val[selectionStart - 1] === "`" &&
          val[selectionStart - 2] === "`"
        ) {
          e.preventDefault();
          const before = val.slice(0, selectionStart);
          const after = val.slice(selectionStart);
          const insertion = "`\n```";
          const newValue = before + insertion + after;
          saveBeforeAction();
          justFormattedRef.current = true;
          onChange(newValue);
          // Place cursor right after the opening ``` (before the newline)
          const cursorPos = selectionStart + 1;
          requestAnimationFrame(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorPos;
          });
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      // Undo: Cmd/Ctrl+Z (without Shift)
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      const shortcuts: Record<string, string> = {
        b: "bold",
        i: "italic",
        u: "underline",
        s: "strikethrough",
        k: "link",
        e: "code",
      };

      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        handleToolbar(action);
      }
    },
    [handleToolbar, undo, redo, saveBeforeAction, flushTyping, onChange],
  );

  const toolbarButtons = [
    { action: "undo", icon: Undo2, title: "Undo (⌘Z)", disabled: !canUndo },
    { action: "redo", icon: Redo2, title: "Redo (⌘⇧Z)", disabled: !canRedo },
    { action: "bold", icon: Bold, title: "Bold (⌘B)" },
    { action: "italic", icon: Italic, title: "Italic (⌘I)" },
    { action: "underline", icon: Underline, title: "Underline (⌘U)" },
    { action: "strikethrough", icon: Strikethrough, title: "Strikethrough (⌘S)" },
    { action: "code", icon: Code, title: "Inline code (⌘E)" },
    { action: "link", icon: Link, title: "Link (⌘K)" },
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
              <span key={btn.action} className="flex items-center">
                {btn.action === "bold" && (
                  <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                )}
                <button
                  type="button"
                  aria-label={btn.title}
                  onClick={() => handleToolbar(btn.action)}
                  disabled={
                    btn.disabled ??
                    (btn.action === "image" && uploading)
                  }
                  className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent dark:disabled:hover:bg-transparent ${
                    btn.action === "image" && uploading ? "animate-spin" : ""
                  }`}
                >
                  <btn.icon className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            ))}
        </div>
        <div className="flex rounded-md bg-slate-200 dark:bg-slate-700 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            aria-pressed={mode === "write" ? "true" : "false"}
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
            aria-pressed={mode === "preview" ? "true" : "false"}
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
            onChange={(e) => trackedOnChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={() => { shiftHeldRef.current = false; }}
            onPaste={handlePaste}
            onDrop={handleDrop}
            placeholder={placeholder}
            rows={rows}
            required={required}
            autoFocus={autoFocus}
            disabled={uploading}
            className="w-full bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none resize-y disabled:opacity-60 card-font"
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
