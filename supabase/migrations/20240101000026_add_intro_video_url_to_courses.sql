-- Add intro_video_url to courses table for course entrance/preview video
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intro_video_url text;
