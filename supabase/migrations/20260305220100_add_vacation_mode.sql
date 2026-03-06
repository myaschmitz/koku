-- Add vacation mode to user_settings
ALTER TABLE user_settings ADD COLUMN vacation_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_settings ADD COLUMN vacation_started_at TIMESTAMPTZ;
