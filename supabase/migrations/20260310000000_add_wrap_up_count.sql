-- Add wrap_up_count column to user_settings (how many cards remain after pressing wrap up)
ALTER TABLE user_settings
  ADD COLUMN wrap_up_count INTEGER DEFAULT 10;
