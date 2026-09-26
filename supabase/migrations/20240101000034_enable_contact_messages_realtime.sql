-- Migration: Enable Realtime on contact_messages table
DO $$
BEGIN
  -- Add table to supabase_realtime publication if not already added
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already in publication
END $$;
