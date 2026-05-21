-- Add recording_url to live_sessions
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS recording_url text;
