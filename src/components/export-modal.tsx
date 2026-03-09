"use client";

import { useState } from "react";
import { X, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  exportApkg,
  exportCsv,
  exportJson,
  downloadFile,
  type ExportCard,
} from "@/lib/import-export";
import type { Card, Deck } from "@/lib/types";
import { toast } from "sonner";

type ExportFormat = "apkg" | "csv" | "json";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  deck: Deck;
}

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; ext: string; desc: string }
> = {
  apkg: {
    label: "Anki Package",
    ext: ".apkg",
    desc: "Compatible with Anki desktop and mobile apps",
  },
  csv: {
    label: "CSV",
    ext: ".csv",
    desc: "Simple spreadsheet format with front and back columns",
  },
  json: {
    label: "JSON (Koku)",
    ext: ".json",
    desc: "Full export with SRS data, reimportable into Koku",
  },
};

export function ExportModal({ open, onClose, deck }: ExportModalProps) {
  const supabase = createClient();
  const [format, setFormat] = useState<ExportFormat>("apkg");
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);

    try {
      // Fetch all cards for this deck
      const { data: cards, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deck.id)
        .order("created_at", { ascending: true });

      if (error) throw new Error("Failed to fetch cards");
      if (!cards || cards.length === 0) {
        toast.error("No cards to export");
        setExporting(false);
        return;
      }

      const sanitizedName = deck.name.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (format === "apkg") {
        const exportCards: ExportCard[] = cards.map((c: Card) => ({
          content: c.content,
        }));
        const blob = await exportApkg(deck.name, exportCards);
        downloadFile(blob, `${sanitizedName}.apkg`, "application/octet-stream");
      } else if (format === "csv") {
        const exportCards: ExportCard[] = cards.map((c: Card) => ({
          content: c.content,
        }));
        const csv = exportCsv(exportCards);
        downloadFile(csv, `${sanitizedName}.csv`, "text/csv");
      } else {
        const json = exportJson(
          deck.name,
          deck.description,
          cards.map((c: Card) => ({
            content: c.content,
            state: c.state,
            stability: c.stability,
            difficulty: c.difficulty,
            reps: c.reps,
            lapses: c.lapses,
            due: c.due,
            last_review: c.last_review,
          })),
        );
        downloadFile(json, `${sanitizedName}.json`, "application/json");
      }

      toast.success(
        `Exported ${cards.length} cards as ${FORMAT_INFO[format].ext}`,
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Export failed",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">
            Export &ldquo;{deck.name}&rdquo;
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format selection */}
        <div className="px-6 py-4 space-y-3">
          {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO.apkg][]).map(
            ([key, info]) => (
              <label
                key={key}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  format === key
                    ? "border-accent-500 dark:border-accent-400 bg-accent-50 dark:bg-accent-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={key}
                  checked={format === key}
                  onChange={() => setFormat(key)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {info.label}{" "}
                    <span className="text-slate-400 font-normal">
                      ({info.ext})
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {info.desc}
                  </p>
                </div>
              </label>
            ),
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
