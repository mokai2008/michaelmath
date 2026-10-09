-- Migration: Enable Realtime on manual_submissions and admin_notifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_submissions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already in publication
END $$;
