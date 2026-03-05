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
  front_title: string;
  front_detail: string | null;
  front_images: string[];
  back_content: string;
  back_images: string[];
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: string;
  last_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
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
  created_at: string;
  updated_at: string;
}

export interface DeckWithCounts extends Deck {
  card_count: number;
  due_count: number;
}
