-- Add progress_percentage column to topics table to support custom progress weighting per lesson
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS progress_percentage numeric DEFAULT 0;

COMMENT ON COLUMN public.topics.progress_percentage IS 'Custom percentage contribution of this lesson to the overall course progress (0-100)';
