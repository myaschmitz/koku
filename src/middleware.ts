import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Only run auth middleware on protected routes; public routes and bot
    // traffic skip it, keeping edge compute and Auth calls down.
    "/decks/:path*",
    "/cards/:path*",
    "/study/:path*",
    "/settings/:path*",
  ],
};
