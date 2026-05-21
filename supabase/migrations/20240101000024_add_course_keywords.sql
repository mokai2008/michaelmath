-- Add keywords array to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];
