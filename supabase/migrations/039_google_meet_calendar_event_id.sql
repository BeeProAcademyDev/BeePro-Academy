-- Store Google Calendar event ids for Google Meet sessions created from the platform.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_meetings_calendar_event_id
  ON public.meetings(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;
