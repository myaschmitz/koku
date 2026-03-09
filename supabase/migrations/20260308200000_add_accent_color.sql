-- Add accent_color column to user_settings
ALTER TABLE user_settings
  ADD COLUMN accent_color TEXT DEFAULT '#3b82f6';
