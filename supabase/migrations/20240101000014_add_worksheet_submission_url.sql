ALTER TABLE public.topic_progress
ADD COLUMN IF NOT EXISTS worksheet_answers_url text;
