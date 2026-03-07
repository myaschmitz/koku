-- Unify front_title, front_detail, and back_content into a single "content" column.
-- Front and back are separated by a "---" line within the markdown.

-- 1. Add the new column
ALTER TABLE cards ADD COLUMN content TEXT NOT NULL DEFAULT '';

-- 2. Migrate existing data into the new column
UPDATE cards SET content =
  CASE
    -- Has both front_detail and back_content
    WHEN front_detail IS NOT NULL AND front_detail != '' THEN
      '# ' || front_title || E'\n\n' || front_detail || E'\n\n---\n\n' || back_content
    -- Has only front_title and back_content
    ELSE
      '# ' || front_title || E'\n\n---\n\n' || back_content
  END;

-- 3. Drop old columns
ALTER TABLE cards DROP COLUMN front_title;
ALTER TABLE cards DROP COLUMN front_detail;
ALTER TABLE cards DROP COLUMN front_images;
ALTER TABLE cards DROP COLUMN back_content;
ALTER TABLE cards DROP COLUMN back_images;
