"use client";

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CardForm } from "@/components/card-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      }
    >
      <NewCardContent />
    </Suspense>
  );
}

function NewCardContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (data: {
    front_title: string;
    front_detail: string;
    back_content: string;
    tags: { id: string; name: string }[];
  }) => {
    if (!userId || !deckId) return;

    const { data: card, error } = await supabase
      .from("cards")
      .insert({
        deck_id: deckId,
        user_id: userId,
        front_title: data.front_title,
        front_detail: data.front_detail || null,
        back_content: data.back_content,
      })
      .select("id")
      .single();

    if (!error && card && data.tags.length > 0) {
      await supabase.from("card_tags").insert(
        data.tags.map((tag) => ({ card_id: card.id, tag_id: tag.id }))
      );
    }

    if (!error) {
      router.push(`/decks/${deckId}`);
    }
  };

  if (!deckId) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">
          No deck specified.
        </p>
        <Link
          href="/decks"
          className="text-blue-500 hover:text-blue-600 text-sm mt-2 inline-block"
        >
          Go to decks
        </Link>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/decks/${deckId}`}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="inline h-4 w-4" /> Back to deck
        </Link>
        <h1 className="text-2xl font-bold mt-1">New Card</h1>
      </div>
      <CardForm onSubmit={handleSubmit} submitLabel="Create Card" userId={userId} />
    </div>
  );
}
