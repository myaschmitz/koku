ALTER TABLE user_settings
  ADD COLUMN font_size integer NOT NULL DEFAULT 16,
  ADD COLUMN font_family text NOT NULL DEFAULT 'sans';
