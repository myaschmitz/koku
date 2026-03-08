export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  user_id: string;
  content: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  suspended: boolean;
  due: string;
  last_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewLog {
  id: string;
  card_id: string;
  user_id: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number;
  reviewed_at: string;
  elapsed_days: number;
  scheduled_days: number;
}

export interface UserSettings {
  user_id: string;
  again_interval_hours: number;
  hard_interval_hours: number;
  good_interval_hours: number;
  easy_interval_hours: number;
  max_new_cards_per_day: number;
  theme: string;
  vacation_mode: boolean;
  vacation_started_at: string | null;
  font_size: number; // px, default 16
  font_family: string; // "sans" | "serif" | "mono"
  default_template: string; // "flashcard", "no-template", or a UUID
  created_at: string;
  updated_at: string;
}

export interface CardTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface DeckWithCounts extends Deck {
  card_count: number;
  due_count: number;
}
