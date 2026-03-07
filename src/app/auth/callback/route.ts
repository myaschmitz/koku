import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}/decks`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

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

      return redirectResponse;
    }

    // Surface the error so we can debug
    const errorRedirect = new URL(`${origin}/login`);
    errorRedirect.searchParams.set("error", error.message);
    return NextResponse.redirect(errorRedirect.toString());
  }

  return NextResponse.redirect(`${origin}/login`);
}
