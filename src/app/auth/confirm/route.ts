import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email",
    });

    if (!error) {
      // Auto-create user_settings on first login
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_settings")
          .upsert(
            { user_id: user.id },
            { onConflict: "user_id" }
          );
      }

      return NextResponse.redirect(`${origin}/decks`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
