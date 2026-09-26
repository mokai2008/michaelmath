-- Add spoken_language column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS spoken_language text DEFAULT 'Arabic Spoken';

UPDATE public.courses 
SET spoken_language = 'Arabic Spoken' 
WHERE spoken_language IS NULL;

COMMENT ON COLUMN public.courses.spoken_language IS 'Spoken instruction language label (e.g. Arabic Spoken, English Spoken) displayed as a badge on the course thumbnail';

