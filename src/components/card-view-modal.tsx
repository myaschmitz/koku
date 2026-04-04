"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  CopyPlus,
  Check,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Tooltip } from "@/components/tooltip";
import { splitCardContent } from "@/lib/card-utils";
import type { Card } from "@/lib/types";

const STATE_LABELS = ["New", "Learning", "Review", "Relearning"];
const STATE_COLORS = [
  "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
];

interface CardViewModalProps {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  onToggleSuspend: (cardId: string, currentSuspended: boolean) => void;
  onDelete: (cardId: string) => void;
  onDuplicate?: (card: Card) => void;
}

export function CardViewModal({
  card,
  open,
  onClose,
  onToggleSuspend,
  onDelete,
  onDuplicate,
}: CardViewModalProps) {
  const [copied, setCopied] = useState(false);

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
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, scrollY);
      };
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleEscape]);

  if (!open || !card) return null;

  const { front, backs } = splitCardContent(card.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(card.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(card.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-view-modal-title"
        className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 id="card-view-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Card
            </h2>
            <div className="flex gap-1">
              <Tooltip label={copied ? "Copied!" : "Copy markdown"}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label={copied ? "Copied!" : "Copy markdown"}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
              {onDuplicate && (
                <Tooltip label="Duplicate card">
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate(card);
                      onClose();
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Duplicate card"
                  >
                    <CopyPlus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              <Tooltip label={card.suspended ? "Unsuspend card" : "Suspend card"}>
                <button
                  type="button"
                  onClick={() => onToggleSuspend(card.id, card.suspended)}
                  className={`p-1.5 rounded-md transition-colors ${
                    card.suspended
                      ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                      : "text-slate-400 hover:text-yellow-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  aria-label={card.suspended ? "Unsuspend card" : "Suspend card"}
                >
                  {card.suspended ? (
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <PauseCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
              <Tooltip label="Edit card">
                <Link
                  href={`/cards/${card.id}/edit`}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Edit card"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Tooltip>
              <Tooltip label="Delete card">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Delete card"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[80vh] overflow-y-auto space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Front
            </span>
            <div className="mt-2 text-slate-600 dark:text-slate-300">
              <Markdown>{front}</Markdown>
            </div>
          </div>

          {backs.map((section, i) => (
            <div key={i}>
              <hr className="border-slate-200 dark:border-slate-700" />
              <div className="mt-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {backs.length === 1 ? "Back" : `Section ${i + 1}`}
                </span>
                <div className="mt-2 text-slate-600 dark:text-slate-300">
                  <Markdown>{section}</Markdown>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            {card.suspended && (
              <span className="rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 text-xs font-medium">
                Suspended
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_COLORS[card.state]}`}
            >
              {STATE_LABELS[card.state]}
            </span>
            <span className="text-xs text-slate-400">
              Due: {new Date(card.due).toLocaleDateString()}
            </span>
            <span className="text-xs text-slate-400">
              Reps: {card.reps}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
