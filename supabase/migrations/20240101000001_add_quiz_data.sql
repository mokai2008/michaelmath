-- Add questions_data JSONB column to support interactive quiz maker
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS questions_data JSONB;
