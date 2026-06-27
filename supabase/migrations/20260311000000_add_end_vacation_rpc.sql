-- Atomically end vacation mode for the calling user: shift every
-- non-suspended card's due date forward by the vacation duration and clear
-- the vacation flags. Replaces a client-side loop that issued one UPDATE per
-- card (hundreds/thousands of round-trips for large collections).
CREATE OR REPLACE FUNCTION end_vacation_mode()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_shift interval;
BEGIN
  SELECT vacation_started_at INTO v_start
  FROM user_settings
  WHERE user_id = auth.uid();

  IF v_start IS NOT NULL THEN
    v_shift := now() - v_start;
    UPDATE cards
      SET due = due + v_shift
      WHERE user_id = auth.uid()
        AND suspended = false;
  END IF;

  UPDATE user_settings
    SET vacation_mode = false,
        vacation_started_at = NULL
    WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION end_vacation_mode() TO authenticated;
