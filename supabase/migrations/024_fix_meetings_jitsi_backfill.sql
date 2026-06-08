-- =====================================================
-- Backfill Jitsi room names for in-platform sessions
-- Migration: 024_fix_meetings_jitsi_backfill.sql
-- =====================================================

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'google_meet';

ALTER TABLE public.meetings
    ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);

UPDATE public.meetings
SET
    platform = 'jitsi',
    jitsi_room_name = 'bepro_' || replace(id::text, '-', '')
WHERE meet_link IS NULL
  AND COALESCE(jitsi_room_name, '') = '';

SELECT '024_fix_meetings_jitsi_backfill applied' AS message;
