import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Only run the auth proxy on protected routes; public routes and bot
    // traffic skip it, keeping edge compute and Auth calls down.
    "/decks/:path*",
    "/cards/:path*",
    "/study/:path*",
    "/settings/:path*",
  ],
};
