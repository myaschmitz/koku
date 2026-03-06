"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  LayoutGrid,
  Columns,
  List,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import type { Card, Deck, Tag } from "@/lib/types";
import { CreateCardModal } from "@/components/create-card-modal";
import { Markdown } from "@/components/markdown";
import { ImageGrid } from "@/components/image-grid";

const STATE_LABELS = ["New", "Learning", "Review", "Relearning"];
const STATE_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
];

type ViewMode = "grid" | "column" | "list";

function CardActions({
  card,
  onDelete,
  onToggleSuspend,
  hideUntilHover,
}: {
  card: Card;
  onDelete: (id: string) => void;
  onToggleSuspend: (id: string, suspended: boolean) => void;
  hideUntilHover?: boolean;
}) {
  return (
    <div className={`flex gap-1 ${hideUntilHover ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""}`}>
      <button
        type="button"
        onClick={() => onToggleSuspend(card.id, card.suspended)}
        className={`p-1 hover:cursor-pointer ${card.suspended ? "text-yellow-500 hover:text-yellow-600" : "text-slate-400 hover:text-yellow-500"}`}
        title={card.suspended ? "Unsuspend" : "Suspend"}
      >
        {card.suspended ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
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
        className="p-1 text-slate-400 hover:text-red-500 hover:cursor-pointer"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CardFrontBack({ card, compact }: { card: Card; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className={compact ? "font-medium" : "text-lg font-semibold"}>
          {card.front_title}
        </h3>
        {card.front_detail && (
          <div
            className={`mt-1 text-slate-600 dark:text-slate-300 ${compact ? "line-clamp-2" : ""}`}
          >
            <Markdown>{card.front_detail}</Markdown>
          </div>
        )}
        {!compact && <ImageGrid images={card.front_images ?? []} />}
      </div>

      <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />

      <div>
        <div
          className={`text-slate-600 dark:text-slate-300 ${compact ? "line-clamp-3" : ""}`}
        >
          <Markdown>{card.back_content}</Markdown>
        </div>
        {!compact && <ImageGrid images={card.back_images ?? []} />}
      </div>
    </div>
  );
}

function CardMeta({ card, tags }: { card: Card; tags: Tag[] }) {
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
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400"
        >
          {tag.name}
        </span>
      ))}
      <span className="text-xs text-slate-400">
        Due: {new Date(card.due).toLocaleDateString()}
      </span>
    </div>
  );
}

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const supabase = createClient();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardTagsMap, setCardTagsMap] = useState<Record<string, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

    if (cardsData && cardsData.length > 0) {
      const cardIds = cardsData.map((c) => c.id);
      const { data: cardTagLinks } = await supabase
        .from("card_tags")
        .select("card_id, tag_id")
        .in("card_id", cardIds);

      if (cardTagLinks && cardTagLinks.length > 0) {
        const tagIds = [...new Set(cardTagLinks.map((l) => l.tag_id))];
        const { data: tagsData } = await supabase
          .from("tags")
          .select("*")
          .in("id", tagIds);

        const tagsById = new Map((tagsData ?? []).map((t) => [t.id, t]));
        const map: Record<string, Tag[]> = {};
        for (const link of cardTagLinks) {
          const tag = tagsById.get(link.tag_id);
          if (tag) {
            (map[link.card_id] ??= []).push(tag);
          }
        }
        setCardTagsMap(map);
      } else {
        setCardTagsMap({});
      }
    } else {
      setCardTagsMap({});
    }

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
      if (user) setUserId(user.id);

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

  const handleToggleSuspend = async (cardId: string, currentSuspended: boolean) => {
    const newSuspended = !currentSuspended;
    await supabase
      .from("cards")
      .update({ suspended: newSuspended, updated_at: new Date().toISOString() })
      .eq("id", cardId);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, suspended: newSuspended } : c))
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
        <div className="flex items-center justify-between">
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
          <div className="hidden sm:flex gap-3 items-center">
            {dueCount > 0 && (
              <Link
                href={`/study/${deckId}`}
                className="rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
              >
                Study ({dueCount})
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              + New Card
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`cursor-pointer p-2 transition-colors ${
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

          <div className="flex sm:hidden gap-3 items-center">
            {dueCount > 0 && (
              <Link
                href={`/study/${deckId}`}
                className="rounded-lg bg-blue-500 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
              >
                Study ({dueCount})
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              + New Card
            </button>
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
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            + New Card
          </button>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`View card: ${card.front_title}`}
                  onClick={() => router.push(`/cards/${card.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/cards/${card.id}`); }}
                  className="group block cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0" />
                    <div onClick={(e) => e.stopPropagation()}>
                      <CardActions card={card} onDelete={handleDeleteCard} onToggleSuspend={handleToggleSuspend} hideUntilHover />
                    </div>
                  </div>
                  <CardFrontBack card={card} compact />
                  <CardMeta card={card} tags={cardTagsMap[card.id] ?? []} />
                </div>
              ))}
            </div>
          )}

          {/* Column View */}
          {viewMode === "column" && (
            <div className="flex gap-4 h-[calc(100vh-200px)]">
              {/* Left panel - card list */}
              <div className="w-1/3 min-w-0 overflow-y-auto space-y-2 pr-2">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={`cursor-pointer w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedCardId === card.id
                        ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {card.front_title}
                    </p>
                    {card.front_detail && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {card.front_detail}
                      </p>
                    )}
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
              <div className="w-2/3 min-w-0 overflow-y-auto">
                {selectedCard ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(selectedCard.id, selectedCard.suspended)}
                          className={`p-1.5 hover:cursor-pointer ${selectedCard.suspended ? "text-yellow-500 hover:text-yellow-600" : "text-slate-400 hover:text-yellow-500"}`}
                          title={selectedCard.suspended ? "Unsuspend" : "Suspend"}
                        >
                          {selectedCard.suspended ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
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

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Front
                        </span>
                        <h2 className="text-xl font-semibold mt-1">
                          {selectedCard.front_title}
                        </h2>
                        {selectedCard.front_detail && (
                          <div className="mt-2 text-slate-600 dark:text-slate-300">
                            <Markdown>{selectedCard.front_detail}</Markdown>
                          </div>
                        )}
                        <ImageGrid images={selectedCard.front_images ?? []} />
                      </div>

                      <div className="border-t border-dashed border-slate-300 dark:border-slate-600" />

                      <div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Back
                        </span>
                        <div className="mt-2 text-slate-600 dark:text-slate-300">
                          <Markdown>{selectedCard.back_content}</Markdown>
                        </div>
                        <ImageGrid images={selectedCard.back_images ?? []} />
                      </div>
                    </div>

                    <CardMeta
                      card={selectedCard}
                      tags={cardTagsMap[selectedCard.id] ?? []}
                    />
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
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/cards/${card.id}`}
                      className="text-sm text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      View card →
                    </Link>
                    <CardActions card={card} onDelete={handleDeleteCard} onToggleSuspend={handleToggleSuspend} hideUntilHover />
                  </div>
                  <CardFrontBack card={card} />
                  <CardMeta card={card} tags={cardTagsMap[card.id] ?? []} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {userId && (
        <CreateCardModal
          deckId={deckId}
          userId={userId}
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={refreshCards}
        />
      )}
    </div>
  );
}
