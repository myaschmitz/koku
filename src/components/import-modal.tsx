"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  importApkg,
  importCsv,
  importJson,
  type ImportedCard,
} from "@/lib/import-export";
import { toast } from "sonner";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  /** If provided, import into this existing deck instead of creating a new one */
  targetDeckId?: string;
  targetDeckName?: string;
}

export function ImportModal({
  open,
  onClose,
  onImported,
  targetDeckId,
  targetDeckName,
}: ImportModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    deckName: string;
    cards: ImportedCard[];
    file: File;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setPreview(null);
    setError(null);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = async (file: File) => {
    setError(null);
    setPreview(null);

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "apkg") {
        const result = await importApkg(file);
        setPreview({ deckName: result.deckName, cards: result.cards, file });
      } else if (ext === "csv" || ext === "tsv" || ext === "txt") {
        const text = await file.text();
        const cards = importCsv(text);
        setPreview({
          deckName: file.name.replace(/\.(csv|tsv|txt)$/i, ""),
          cards,
          file,
        });
      } else if (ext === "json") {
        const text = await file.text();
        const result = importJson(text);
        setPreview({ deckName: result.deckName, cards: result.cards, file });
      } else {
        setError(
          `Unsupported file type: .${ext}. Supported formats: .apkg, .csv, .tsv, .txt, .json`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse file",
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let deckId = targetDeckId;

      if (!deckId) {
        // Create new deck
        const { data: deck, error: deckError } = await supabase
          .from("decks")
          .insert({
            user_id: user.id,
            name: preview.deckName,
            description: `Imported from ${preview.file.name}`,
          })
          .select("id")
          .single();

        if (deckError || !deck) throw new Error("Failed to create deck");
        deckId = deck.id;
      }

      // Insert cards in batches
      const now = new Date().toISOString();
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < preview.cards.length; i += batchSize) {
        const batch = preview.cards.slice(i, i + batchSize);
        const rows = batch.map((card) => ({
          deck_id: deckId,
          user_id: user.id,
          content: `${card.front}\n\n---\n\n${card.back}`,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 0,
          suspended: false,
          due: now,
          last_review: null,
        }));

        const { error: insertError } = await supabase
          .from("cards")
          .insert(rows);

        if (insertError) throw new Error(`Failed to import cards: ${insertError.message}`);
        imported += batch.length;
      }

      toast.success(
        `Imported ${imported} cards${targetDeckId ? ` into ${targetDeckName}` : ` as "${preview.deckName}"`}`,
      );
      handleClose();
      onImported();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed",
      );
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">
            Import Cards
            {targetDeckName && (
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {" "}
                into {targetDeckName}
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {!preview ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                }`}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Supports .apkg (Anki), .csv, .tsv, .txt, .json
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".apkg,.csv,.tsv,.txt,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Format hints */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Supported Formats
                </p>
                <div className="grid gap-2 text-sm">
                  <div className="flex gap-2 items-start">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        .apkg
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        — Anki deck packages
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        .csv / .tsv
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        — Two columns: front, back
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        .json
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        — Koku export or array of {"{front, back}"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Deck name
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {targetDeckName ?? preview.deckName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cards found
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {preview.cards.length}
                  </p>
                </div>

                {/* Card preview */}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Preview (first 5 cards)
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {preview.cards.slice(0, 5).map((card, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm"
                      >
                        <div className="text-slate-900 dark:text-slate-100 line-clamp-2">
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            Q:{" "}
                          </span>
                          {card.front || "(empty)"}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            A:{" "}
                          </span>
                          {card.back || "(empty)"}
                        </div>
                      </div>
                    ))}
                    {preview.cards.length > 5 && (
                      <p className="text-xs text-slate-400 text-center">
                        ...and {preview.cards.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex gap-2 items-start rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          {preview && (
            <button
              onClick={reset}
              className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 disabled:opacity-50 transition-colors"
            >
              {importing
                ? "Importing..."
                : `Import ${preview.cards.length} Cards`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
