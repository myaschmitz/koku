import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in to Koku to study your spaced repetition flashcards and track your learning progress.",
  openGraph: {
    title: "Log In | Koku",
    description:
      "Sign in to Koku to study your spaced repetition flashcards and track your learning progress.",
    url: "https://www.koku.cards/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
