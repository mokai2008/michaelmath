-- Add content_items column to topics table to support multiple videos, quizzes, worksheets, and notes per lesson
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS content_items jsonb DEFAULT '[]'::jsonb;
