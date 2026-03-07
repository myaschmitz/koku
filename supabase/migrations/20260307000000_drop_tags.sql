-- Remove tags functionality
DROP POLICY IF EXISTS "Users manage own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users see own tags" ON tags;

DROP TABLE IF EXISTS card_tags;
DROP TABLE IF EXISTS tags;
