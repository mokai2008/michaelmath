-- Add embed_code column to quizzes table to support Canva AI and custom HTML embed quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS embed_code text;
