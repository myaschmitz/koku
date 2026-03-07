"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CardForm } from "@/components/card-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Card, Tag } from "@/lib/types";

export default function EditCardPage() {
  const params = useParams();
  const cardId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const [card, setCard] = useState<Card | null>(null);
  const [cardTags, setCardTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("id", cardId)
        .single();

      // Fetch existing tags for this card
      const { data: tagLinks } = await supabase
        .from("card_tags")
        .select("tag_id")
        .eq("card_id", cardId);

      if (tagLinks && tagLinks.length > 0) {
        const tagIds = tagLinks.map((l) => l.tag_id);
        const { data: tags } = await supabase
          .from("tags")
          .select("*")
          .in("id", tagIds);
        setCardTags(tags ?? []);
      }

      setCard(data);
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const checkDuplicate = async (title: string) => {
    if (!card) return null;
    const normalized = title.replace(/^\d+[\.\-\s]+\s*/, "").trim();
    if (!normalized) return null;
    const escaped = normalized.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data } = await supabase
      .from("cards")
      .select("id, content")
      .eq("deck_id", card.deck_id)
      .neq("id", cardId)
      .ilike("content", `%${escaped}%`)
      .limit(1)
      .single();
    if (!data) return null;
    const { getCardTitle } = await import("@/lib/card-utils");
    return { id: data.id, title: getCardTitle(data.content) };
  };

  const handleSubmit = async (data: {
    content: string;
    tags: Tag[];
  }) => {
    const { error } = await supabase
      .from("cards")
      .update({
        content: data.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId);

    if (!error) {
      // Replace card_tags: delete existing, insert new
      await supabase.from("card_tags").delete().eq("card_id", cardId);
      if (data.tags.length > 0) {
        await supabase.from("card_tags").insert(
          data.tags.map((tag) => ({ card_id: cardId, tag_id: tag.id }))
        );
      }
      router.push(`/cards/${cardId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Card not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/cards/${cardId}`}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="inline h-4 w-4" /> Back to card
        </Link>
        <h1 className="text-2xl font-bold mt-1">Edit Card</h1>
      </div>
      <CardForm
        initial={{
          content: card.content,
          tags: cardTags,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        userId={card.user_id}
        cardId={card.id}
        checkDuplicate={checkDuplicate}
      />
    </div>
  );
}
