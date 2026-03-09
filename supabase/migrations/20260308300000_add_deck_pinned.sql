-- Add pinned column to decks
ALTER TABLE decks ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
