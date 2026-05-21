-- Add advanced quiz features: time limit, passing score, and settings
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"shuffle_questions": false, "shuffle_options": false}'::JSONB;
