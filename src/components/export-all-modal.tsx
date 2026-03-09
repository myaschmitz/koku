"use client";

import { useState } from "react";
import { X, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import JSZip from "jszip";
import {
  exportApkg,
  exportCsv,
  exportJson,
  exportAllJson,
  downloadFile,
  type ExportCard,
} from "@/lib/import-export";
import type { Card, Deck } from "@/lib/types";
import { toast } from "sonner";

type ExportFormat = "apkg" | "csv" | "json";

interface ExportAllModalProps {
  open: boolean;
  onClose: () => void;
}

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; ext: string; desc: string }
> = {
  apkg: {
    label: "Anki Packages",
    ext: ".apkg",
    desc: "One .apkg file per deck in a .zip archive, compatible with Anki desktop and mobile",
  },
  csv: {
    label: "CSV",
    ext: ".csv",
    desc: "One .csv file per deck in a .zip archive, simple spreadsheet format",
  },
  json: {
    label: "JSON (Koku)",
    ext: ".json",
    desc: "Single file with all decks and full SRS data, reimportable into Koku",
  },
};

export function ExportAllModal({ open, onClose }: ExportAllModalProps) {
  const supabase = createClient();
  const [format, setFormat] = useState<ExportFormat>("apkg");
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all decks
      const { data: decks, error: decksError } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (decksError) throw new Error("Failed to fetch decks");
      if (!decks || decks.length === 0) {
        toast.error("No decks to export");
        setExporting(false);
        return;
      }

      // Fetch all cards
      const { data: allCards, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cardsError) throw new Error("Failed to fetch cards");

      const cardsByDeck = new Map<string, Card[]>();
      for (const card of allCards ?? []) {
        const list = cardsByDeck.get(card.deck_id) ?? [];
        list.push(card);
        cardsByDeck.set(card.deck_id, list);
      }

      if (format === "json") {
        // Single JSON file with all decks
        const deckData = decks.map((deck: Deck) => ({
          name: deck.name,
          description: deck.description,
          cards: (cardsByDeck.get(deck.id) ?? []).map((c: Card) => ({
            content: c.content,
            state: c.state,
            stability: c.stability,
            difficulty: c.difficulty,
            reps: c.reps,
            lapses: c.lapses,
            due: c.due,
            last_review: c.last_review,
          })),
        }));
        const json = exportAllJson(deckData);
        downloadFile(json, "koku-export.json", "application/json");
      } else {
        // ZIP archive with one file per deck
        const zip = new JSZip();
        let totalCards = 0;

        for (const deck of decks as Deck[]) {
          const cards = cardsByDeck.get(deck.id) ?? [];
          if (cards.length === 0) continue;

          const sanitizedName = deck.name.replace(/[^a-zA-Z0-9_-]/g, "_");
          totalCards += cards.length;

          if (format === "apkg") {
            const exportCards: ExportCard[] = cards.map((c: Card) => ({
              content: c.content,
            }));
            const blob = await exportApkg(deck.name, exportCards);
            zip.file(`${sanitizedName}.apkg`, blob);
          } else {
            const exportCards: ExportCard[] = cards.map((c: Card) => ({
              content: c.content,
            }));
            const csv = exportCsv(exportCards);
            zip.file(`${sanitizedName}.csv`, csv);
          }
        }

        if (totalCards === 0) {
          toast.error("All decks are empty, nothing to export");
          setExporting(false);
          return;
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const ext = format === "apkg" ? "apkg" : "csv";
        downloadFile(zipBlob, `koku-export-${ext}.zip`, "application/zip");
      }

      const totalCards = Array.from(cardsByDeck.values()).reduce(
        (sum, cards) => sum + cards.length,
        0,
      );
      toast.success(
        `Exported ${decks.length} decks (${totalCards} cards) as ${FORMAT_INFO[format].ext}`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Export All Decks</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format selection */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose a format for your export:
          </p>
          {(
            Object.entries(FORMAT_INFO) as [
              ExportFormat,
              (typeof FORMAT_INFO)[ExportFormat],
            ][]
          ).map(([key, info]) => (
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
                name="export-all-format"
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
          ))}
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
            {exporting ? "Exporting..." : "Export All"}
          </button>
        </div>
      </div>
    </div>
  );
}
