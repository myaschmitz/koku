"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Upload, Download, Pin, PinOff, LayoutGrid, List } from "lucide-react";
import type { DeckWithCounts } from "@/lib/types";
import { ImportModal } from "@/components/import-modal";
import { ExportAllModal } from "@/components/export-all-modal";
import { Tooltip } from "@/components/tooltip";
import { useViewMode } from "@/hooks/use-view-mode";

export default function DecksPage() {
  const router = useRouter();
  const supabase = createClient();
  const [decks, setDecks] = useState<DeckWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [totalDue, setTotalDue] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showExportAll, setShowExportAll] = useState(false);
  const [viewMode, setViewMode] = useViewMode<"grid" | "list">("decks", "grid");

  const fetchDecks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawDecks } = await supabase
      .from("decks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!rawDecks) return;

    const now = new Date().toISOString();
    const decksWithCounts: DeckWithCounts[] = await Promise.all(
      rawDecks.map(async (deck) => {
        const { count: cardCount } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id);

        // New cards (state=0, not suspended)
        const { count: newCount } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id)
          .eq("suspended", false)
          .eq("state", 0);

        // Learning/relearning cards (state=1 or state=3, due now)
        const { count: learnCount } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id)
          .eq("suspended", false)
          .in("state", [1, 3])
          .lte("due", now);

        // Review cards (state=2, due now)
        const { count: reviewDueCount } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deck.id)
          .eq("suspended", false)
          .eq("state", 2)
          .lte("due", now);

        const dueCount = (newCount ?? 0) + (learnCount ?? 0) + (reviewDueCount ?? 0);

        return {
          ...deck,
          card_count: cardCount ?? 0,
          due_count: dueCount,
          new_count: newCount ?? 0,
          learn_count: learnCount ?? 0,
        };
      }),
    );

    // Sort: pinned first, then by created_at descending
    decksWithCounts.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setDecks(decksWithCounts);
    setTotalDue(decksWithCounts.reduce((sum, d) => sum + d.due_count, 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("decks").insert({
      user_id: user.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
    });

    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    fetchDecks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    await supabase.from("decks").delete().eq("id", id);
    fetchDecks();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    await supabase
      .from("decks")
      .update({
        name: editName.trim(),
        description: editDesc.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);
    setEditingId(null);
    fetchDecks();
  };

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    await supabase
      .from("decks")
      .update({ pinned: !currentlyPinned })
      .eq("id", id);
    fetchDecks();
  };

  const startEdit = (deck: DeckWithCounts) => {
    setEditingId(deck.id);
    setEditName(deck.name);
    setEditDesc(deck.description ?? "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Decks</h1>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {totalDue > 0 && (
            <Link
              href="/study"
              className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
            >
              Study All Due ({totalDue})
            </Link>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3 items-center">
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            <Tooltip label="Grid view">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-2 text-sm transition-colors ${viewMode === "grid" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip label="List view">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`p-2 text-sm transition-colors ${viewMode === "list" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          <Tooltip label="Import deck">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              aria-label="Import deck"
              className="rounded-lg border border-slate-300 dark:border-slate-600 p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Upload className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="Export all decks">
            <button
              type="button"
              onClick={() => setShowExportAll(true)}
              aria-label="Export all decks"
              className="rounded-lg border border-slate-300 dark:border-slate-600 p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            + New Deck
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3"
        >
          <label htmlFor="new-deck-name" className="sr-only">Deck name</label>
          <input
            id="new-deck-name"
            autoFocus
            placeholder="Deck name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <label htmlFor="new-deck-desc" className="sr-only">Description (optional)</label>
          <input
            id="new-deck-desc"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {decks.length === 0 && !showCreate ? (
        <div className="text-center py-20">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            No decks yet. Create your first deck to get started!
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-accent-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 transition-colors"
          >
            + New Deck
          </button>
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                <th className="px-3 sm:px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Deck</th>
                <th className="px-2 sm:px-4 py-3 font-medium text-blue-600 dark:text-blue-400 text-right w-12 sm:w-16">New</th>
                <th className="px-2 sm:px-4 py-3 font-medium text-orange-600 dark:text-orange-400 text-right w-12 sm:w-16">Learn</th>
                <th className="px-2 sm:px-4 py-3 font-medium text-green-600 dark:text-green-400 text-right w-12 sm:w-16">Due</th>
                <th className="hidden sm:table-cell px-4 py-3 w-24"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr
                  key={deck.id}
                  onClick={() => router.push(`/decks/${deck.id}`)}
                  className="border-b last:border-b-0 border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2">
                      {deck.pinned && <Pin className="h-3 w-3 text-accent-500 shrink-0" />}
                      <span className="font-medium text-slate-900 dark:text-slate-100">{deck.name}</span>
                    </div>
                    {deck.description && (
                      <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                        {deck.description}
                      </p>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right tabular-nums">
                    <span className={deck.new_count > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-400 dark:text-slate-500"}>
                      {deck.new_count}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right tabular-nums">
                    <span className={deck.learn_count > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : "text-slate-400 dark:text-slate-500"}>
                      {deck.learn_count}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right tabular-nums">
                    <span className={(deck.due_count - deck.new_count - deck.learn_count) > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-400 dark:text-slate-500"}>
                      {deck.due_count - deck.new_count - deck.learn_count}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {deck.due_count > 0 && (
                        <button
                          type="button"
                          onClick={() => router.push(`/study/${deck.id}`)}
                          className="rounded bg-accent-500/80 dark:bg-accent-500/60 px-2 py-1 text-xs text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
                        >
                          Study
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePin(deck.id, deck.pinned)}
                        className={`p-1 ${deck.pinned ? "text-accent-500" : "text-slate-400"} hover:text-accent-600 dark:hover:text-accent-400`}
                        aria-label={deck.pinned ? "Unpin" : "Pin to top"}
                      >
                        {deck.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(deck)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        aria-label="Edit deck"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(deck.id)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        aria-label="Delete deck"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {decks.some((d) => d.pinned) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {decks.filter((d) => d.pinned).map((deck) =>
                editingId === deck.id ? (
                  <form
                    key={deck.id}
                    onSubmit={handleEdit}
                    className="rounded-lg border border-accent-500 bg-white dark:bg-slate-800 p-4 space-y-3"
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-accent-500/80 px-3 py-1.5 text-sm text-white hover:bg-accent-600/80 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <Link
                    key={deck.id}
                    href={`/decks/${deck.id}`}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {deck.name}
                        </h3>
                        {deck.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {deck.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            togglePin(deck.id, deck.pinned);
                          }}
                          className={`p-1 ${deck.pinned ? "text-accent-500" : "text-slate-400"} hover:text-accent-600 dark:hover:text-accent-400`}
                          aria-label={deck.pinned ? "Unpin" : "Pin to top"}
                        >
                          {deck.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            startEdit(deck);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          aria-label="Edit deck"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(deck.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500"
                          aria-label="Delete deck"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span>{deck.card_count} cards</span>
                      {deck.due_count > 0 && (
                        <span className="rounded-full bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 px-2 py-0.5 text-xs font-medium">
                          {deck.due_count} due
                        </span>
                      )}
                    </div>
                    {deck.due_count > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(`/study/${deck.id}`);
                          }}
                          className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-3 py-1.5 text-sm text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
                        >
                          Study ({deck.due_count})
                        </button>
                      </div>
                    )}
                  </Link>
                ),
              )}
            </div>
          )}
          {decks.some((d) => d.pinned) && decks.some((d) => !d.pinned) && (
            <hr className="border-dashed border-slate-200 dark:border-slate-700" />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {decks.filter((d) => !d.pinned).map((deck) =>
              editingId === deck.id ? (
              <form
                key={deck.id}
                onSubmit={handleEdit}
                className="rounded-lg border border-accent-500 bg-white dark:bg-slate-800 p-4 space-y-3"
              >
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-accent-500/80 px-3 py-1.5 text-sm text-white hover:bg-accent-600/80 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {deck.name}
                    </h3>
                    {deck.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {deck.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        togglePin(deck.id, deck.pinned);
                      }}
                      className={`p-1 ${deck.pinned ? "text-accent-500" : "text-slate-400"} hover:text-accent-600 dark:hover:text-accent-400`}
                      title={deck.pinned ? "Unpin" : "Pin to top"}
                    >
                      {deck.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        startEdit(deck);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(deck.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>{deck.card_count} cards</span>
                  {deck.due_count > 0 && (
                    <span className="rounded-full bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 px-2 py-0.5 text-xs font-medium">
                      {deck.due_count} due
                    </span>
                  )}
                </div>
                {deck.due_count > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/study/${deck.id}`);
                      }}
                      className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-3 py-1.5 text-sm text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
                    >
                      Study ({deck.due_count})
                    </button>
                  </div>
                )}
              </Link>
            ),
          )}
          </div>
        </div>
      )}

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchDecks}
      />

      <ExportAllModal
        open={showExportAll}
        onClose={() => setShowExportAll(false)}
      />
    </div>
  );
}
