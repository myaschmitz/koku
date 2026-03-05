"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CardForm } from "@/components/card-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCardPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");

  const handleSubmit = async (data: {
    front_title: string;
    front_detail: string;
    back_content: string;
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !deckId) return;

    const { error } = await supabase.from("cards").insert({
      deck_id: deckId,
      user_id: user.id,
      front_title: data.front_title,
      front_detail: data.front_detail || null,
      front_images: [],
      back_content: data.back_content,
      back_images: [],
    });

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
      <CardForm onSubmit={handleSubmit} submitLabel="Create Card" />
    </div>
  );
}
