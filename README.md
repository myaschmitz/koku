# Koku

A spaced repetition flashcard app built for developers. Create decks, write cards with Markdown and syntax-highlighted code blocks, and study using the FSRS algorithm to optimize your learning schedule.

**Try it at [koku.cards](https://koku.cards)**

## Features

- **Spaced repetition** powered by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) for intelligent review scheduling
- **Markdown support** with syntax-highlighted code blocks
- **Deck organization** with tags for categorizing cards
- **Image support** including HEIC conversion
- **Vacation mode** to pause reviews when you're away
- **Dark mode** support
- **Keyboard shortcuts** for faster workflows

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) (Auth + PostgreSQL database)
- [Tailwind CSS](https://tailwindcss.com)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (spaced repetition algorithm)
- [react-markdown](https://github.com/remarkjs/react-markdown) + [Shiki](https://shiki.matsu.io) (syntax highlighting)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)
