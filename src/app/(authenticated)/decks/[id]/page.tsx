"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  LayoutGrid,
  Columns,
  List,
  PauseCircle,
  PlayCircle,
  Plus,
  Copy,
  CopyPlus,
  Check,
  Download,
  Upload,
} from "lucide-react";
import type { Card, Deck, CardTemplate } from "@/lib/types";
import { CreateCardModal } from "@/components/create-card-modal";
import { CardViewModal } from "@/components/card-view-modal";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { NewCardButton } from "@/components/new-card-button";
import { CreateTemplateModal } from "@/components/create-template-modal";
import { DuplicateCardModal } from "@/components/duplicate-card-modal";
import { Tooltip } from "@/components/tooltip";
import { Markdown } from "@/components/markdown";
import { useViewMode } from "@/hooks/use-view-mode";
import { splitCardContent, getCardTitle } from "@/lib/card-utils";
import { getTemplateContent } from "@/lib/card-templates";

const STATE_LABELS = ["New", "Learning", "Review", "Relearning"];
const STATE_COLORS = [
  "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
];

type ViewMode = "grid" | "column" | "list";

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      title={copied ? "Copied!" : "Copy markdown"}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function CardActions({
  card,
  onDelete,
  onToggleSuspend,
  onDuplicate,
  hideUntilHover,
}: {
  card: Card;
  onDelete: (id: string) => void;
  onToggleSuspend: (id: string, suspended: boolean) => void;
  onDuplicate: (card: Card) => void;
  hideUntilHover?: boolean;
}) {
  return (
    <div
      className={`flex gap-1 ${hideUntilHover ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""}`}
    >
      <CopyButton content={card.content} />
      <button
        type="button"
        onClick={() => onDuplicate(card)}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        title="Duplicate"
      >
        <CopyPlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onToggleSuspend(card.id, card.suspended)}
        className={`p-1 ${card.suspended ? "text-yellow-500 hover:text-yellow-600" : "text-slate-400 hover:text-yellow-500"}`}
        title={card.suspended ? "Unsuspend" : "Suspend"}
      >
        {card.suspended ? (
          <PlayCircle className="h-4 w-4" />
        ) : (
          <PauseCircle className="h-4 w-4" />
        )}
      </button>
      <Link
        href={`/cards/${card.id}/edit`}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={() => onDelete(card.id)}
        className="p-1 text-slate-400 hover:text-red-500"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CardFrontBack({ card, compact }: { card: Card; compact?: boolean }) {
  const { front, backs } = splitCardContent(card.content);
  return (
    <div className="space-y-3">
      <div
        className={`text-slate-600 dark:text-slate-300 ${compact ? "line-clamp-3" : ""}`}
      >
        <Markdown>{front}</Markdown>
      </div>

      {backs.length > 0 && compact && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Plus className="h-3.5 w-3.5" />
          <span>
            {backs.length} hidden {backs.length === 1 ? "section" : "sections"}
          </span>
        </div>
      )}

      {backs.length > 0 &&
        !compact &&
        backs.map((section, i) => (
          <div key={i}>
            <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />
            <div className="text-slate-600 dark:text-slate-300 mt-3">
              <Markdown>{section}</Markdown>
            </div>
          </div>
        ))}
    </div>
  );
}

function CardMeta({ card }: { card: Card }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
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
    </div>
  );
}

export default function DeckDetailPage() {
  const params = useParams();
  const deckId = params.id as string;
  const supabase = createClient();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useViewMode<ViewMode>("deck-detail", "grid");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewCardId, setViewCardId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [duplicateCard, setDuplicateCard] = useState<Card | null>(null);
  const [userTemplates, setUserTemplates] = useState<CardTemplate[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState("flashcard");
  const [templateContent, setTemplateContent] = useState("");
  const columnDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    columnDetailRef.current?.scrollTo(0, 0);
  }, [selectedCardId]);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const content = getTemplateContent(templateId, userTemplates);
      setTemplateContent(content);
      setShowCreateModal(true);
    },
    [userTemplates],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !showCreateModal &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        handleTemplateSelect(defaultTemplateId);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showCreateModal, defaultTemplateId, handleTemplateSelect]);

  const refreshCards = useCallback(async () => {
    const { data: cardsData } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });

    const now = new Date().toISOString();
    const { count } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("suspended", false)
      .lte("due", now);

    setCards(cardsData ?? []);
    setDueCount(count ?? 0);
    if (cardsData && cardsData.length > 0 && !selectedCardId) {
      setSelectedCardId(cardsData[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Fetch user templates
        const { data: templates } = await supabase
          .from("card_templates")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (templates) setUserTemplates(templates as CardTemplate[]);

        // Fetch default template setting
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("default_template")
          .eq("user_id", user.id)
          .single();
        if (settingsData?.default_template) {
          setDefaultTemplateId(settingsData.default_template);
        }
      }

      const { data: deckData } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .single();

      setDeck(deckData);
      await refreshCards();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    await supabase.from("cards").delete().eq("id", cardId);
    const remaining = cards.filter((c) => c.id !== cardId);
    setCards(remaining);
    if (selectedCardId === cardId) {
      setSelectedCardId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleToggleSuspend = async (
    cardId: string,
    currentSuspended: boolean,
  ) => {
    const newSuspended = !currentSuspended;
    await supabase
      .from("cards")
      .update({ suspended: newSuspended, updated_at: new Date().toISOString() })
      .eq("id", cardId);
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, suspended: newSuspended } : c,
      ),
    );
    // Update due count since suspended cards are excluded
    const now = new Date().toISOString();
    const { count } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("suspended", false)
      .lte("due", now);
    setDueCount(count ?? 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Deck not found</p>
      </div>
    );
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const viewButtons: {
    mode: ViewMode;
    icon: typeof LayoutGrid;
    label: string;
  }[] = [
    { mode: "grid", icon: LayoutGrid, label: "Grid" },
    { mode: "column", icon: Columns, label: "Column" },
    { mode: "list", icon: List, label: "List" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <Link
            href="/decks"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <ArrowLeft className="inline h-4 w-4" /> Back to decks
          </Link>
          <h1 className="text-2xl font-bold mt-1">{deck.name}</h1>
          {deck.description && (
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {deck.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {dueCount > 0 && (
            <Link
              href={`/study/${deckId}`}
              className="rounded-lg bg-accent-500/80 dark:bg-accent-500/60 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 dark:hover:bg-accent-400/60 transition-colors"
            >
              Study ({dueCount})
            </Link>
          )}
          <div className="flex shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`p-2 transition-colors ${
                  viewMode === mode
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Tooltip label="Import cards">
              <button
                type="button"
                onClick={() => setShowImport(true)}
                aria-label="Import cards"
                className="rounded-lg border border-slate-300 dark:border-slate-600 p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip label="Export deck">
              <button
                type="button"
                onClick={() => setShowExport(true)}
                aria-label="Export deck"
                className="rounded-lg border border-slate-300 dark:border-slate-600 p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </Tooltip>
            <NewCardButton
              defaultTemplateId={defaultTemplateId}
              userTemplates={userTemplates}
              onSelect={handleTemplateSelect}
              onNewTemplate={() => setShowTemplateModal(true)}
            />
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            No cards in this deck yet.
          </p>
          <button
            type="button"
            onClick={() => handleTemplateSelect(defaultTemplateId)}
            className="rounded-lg bg-accent-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600/80 transition-colors"
          >
            + New Card
          </button>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleTemplateSelect(defaultTemplateId)}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-4 min-h-30 text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <Plus className="h-8 w-8 mb-2" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">New Card</span>
                  <kbd className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                    N
                  </kbd>
                </div>
              </button>
              {cards.map((card) => (
                <div
                  key={card.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`View card: ${getCardTitle(card.content)}`}
                  onClick={() => setViewCardId(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setViewCardId(card.id);
                  }}
                  className="group relative block cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm px-1 py-0.5"
                  >
                    <CardActions
                      card={card}
                      onDelete={handleDeleteCard}
                      onToggleSuspend={handleToggleSuspend}
                      onDuplicate={setDuplicateCard}
                    />
                  </div>
                  <CardFrontBack card={card} compact />
                  <CardMeta card={card} />
                </div>
              ))}
            </div>
          )}

          {/* Column View */}
          {viewMode === "column" && (
            <div className="flex flex-col sm:flex-row gap-4 sm:h-[calc(100vh-200px)]">
              {/* Left panel - card list */}
              <div className="sm:w-1/3 min-w-0 overflow-y-auto space-y-2 sm:pr-2 max-h-64 sm:max-h-none">
                <button
                  type="button"
                  onClick={() => handleTemplateSelect(defaultTemplateId)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-3 text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">New Card</span>
                  <kbd className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                    N
                  </kbd>
                </button>
                {cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedCardId === card.id
                        ? "border-accent-500 dark:border-accent-400 bg-accent-50 dark:bg-accent-900/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    }`}
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {getCardTitle(card.content)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_COLORS[card.state]}`}
                      >
                        {STATE_LABELS[card.state]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right panel - selected card detail */}
              <div
                ref={columnDetailRef}
                className="sm:w-2/3 min-w-0 overflow-y-auto"
              >
                {selectedCard ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div />
                      <div className="flex gap-1">
                        <CopyButton content={selectedCard.content} />
                        <button
                          type="button"
                          onClick={() => setDuplicateCard(selectedCard)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          title="Duplicate"
                        >
                          <CopyPlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSuspend(
                              selectedCard.id,
                              selectedCard.suspended,
                            )
                          }
                          className={`p-1.5 ${selectedCard.suspended ? "text-yellow-500 hover:text-yellow-600" : "text-slate-400 hover:text-yellow-500"}`}
                          title={
                            selectedCard.suspended ? "Unsuspend" : "Suspend"
                          }
                        >
                          {selectedCard.suspended ? (
                            <PlayCircle className="h-4 w-4" />
                          ) : (
                            <PauseCircle className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/cards/${selectedCard.id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(selectedCard.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <CardFrontBack card={selectedCard} />

                    <CardMeta card={selectedCard} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Select a card to view
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-5 text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">New Card</span>
                <kbd className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                  N
                </kbd>
              </button>
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setViewCardId(card.id)}
                      className="text-sm text-slate-400 hover:text-accent-500 transition-colors"
                    >
                      View card →
                    </button>
                    <CardActions
                      card={card}
                      onDelete={handleDeleteCard}
                      onToggleSuspend={handleToggleSuspend}
                      onDuplicate={setDuplicateCard}
                      hideUntilHover
                    />
                  </div>
                  <CardFrontBack card={card} />
                  <CardMeta card={card} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {userId && (
        <>
          <CreateCardModal
            deckId={deckId}
            userId={userId}
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={refreshCards}
            initialContent={templateContent}
          />
          <CreateTemplateModal
            userId={userId}
            open={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onCreated={(template) =>
              setUserTemplates((prev) => [...prev, template])
            }
          />
        </>
      )}

      <CardViewModal
        card={cards.find((c) => c.id === viewCardId) ?? null}
        open={viewCardId !== null}
        onClose={() => setViewCardId(null)}
        onToggleSuspend={handleToggleSuspend}
        onDelete={(id) => {
          setViewCardId(null);
          handleDeleteCard(id);
        }}
        onDuplicate={(card) => {
          setViewCardId(null);
          setDuplicateCard(card);
        }}
      />

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        deck={deck}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refreshCards}
        targetDeckId={deckId}
        targetDeckName={deck.name}
      />

      {userId && (
        <DuplicateCardModal
          card={duplicateCard}
          currentDeckId={deckId}
          userId={userId}
          open={duplicateCard !== null}
          onClose={() => setDuplicateCard(null)}
          onDuplicated={refreshCards}
        />
      )}
    </div>
  );
}
