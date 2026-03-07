import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://www.koku.cards";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Koku - Spaced Repetition Flashcards",
    template: "%s | Koku",
  },
  description:
    "Master any subject with Koku — a spaced repetition flashcard app that helps you learn and retain knowledge efficiently.",
  keywords: [
    "spaced repetition",
    "flashcards",
    "learning",
    "study",
    "memorization",
    "anki",
    "SRS",
  ],
  openGraph: {
    type: "website",
    siteName: "Koku",
    title: "Koku - Spaced Repetition Flashcards",
    description:
      "Master any subject with Koku — a spaced repetition flashcard app that helps you learn and retain knowledge efficiently.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Koku - Spaced Repetition Flashcards",
    description:
      "Master any subject with Koku — a spaced repetition flashcard app that helps you learn and retain knowledge efficiently.",
  },
  alternates: {
    canonical: siteUrl,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Koku",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#202228",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
