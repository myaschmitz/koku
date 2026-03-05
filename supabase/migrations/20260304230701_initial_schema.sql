-- Tables
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  front_title TEXT NOT NULL,
  front_detail TEXT,
  front_images TEXT[] DEFAULT '{}',
  back_content TEXT NOT NULL,
  back_images TEXT[] DEFAULT '{}',
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state INTEGER DEFAULT 0,        -- 0=New, 1=Learning, 2=Review, 3=Relearning
  due TIMESTAMPTZ DEFAULT now(),
  last_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE card_tags (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL,        -- 1=Again, 2=Hard, 3=Good, 4=Easy
  state INTEGER NOT NULL,         -- card state BEFORE review
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  elapsed_days INTEGER,
  scheduled_days INTEGER
);

CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  again_interval_hours INTEGER DEFAULT 24,
  hard_interval_hours INTEGER DEFAULT 72,
  max_new_cards_per_day INTEGER DEFAULT 20,
  theme TEXT DEFAULT 'system',    -- 'light', 'dark', or 'system'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cards_due ON cards(user_id, due);
CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_state ON cards(user_id, state);
CREATE INDEX idx_review_logs_user ON review_logs(user_id, reviewed_at);
CREATE INDEX idx_card_tags_tag ON card_tags(tag_id);

-- Row Level Security
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own decks" ON decks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own cards" ON cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own tags" ON tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own card_tags" ON card_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM cards WHERE cards.id = card_id AND cards.user_id = auth.uid())
);
CREATE POLICY "Users see own review_logs" ON review_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for card images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

CREATE POLICY "Users manage own images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'card-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
