-- Add good_interval_hours and easy_interval_hours to user_settings
-- Update hard_interval_hours default from 72 to 48
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS good_interval_hours INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS easy_interval_hours INTEGER DEFAULT 192;

ALTER TABLE user_settings
  ALTER COLUMN hard_interval_hours SET DEFAULT 48;

-- Update existing rows that have the old hard default
UPDATE user_settings
  SET hard_interval_hours = 48
  WHERE hard_interval_hours = 72;
