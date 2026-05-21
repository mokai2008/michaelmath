-- 1. Create topic_progress table to track student progress and time spent
CREATE TABLE IF NOT EXISTS public.topic_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  is_completed boolean DEFAULT false NOT NULL,
  time_spent_seconds integer DEFAULT 0 NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL,
  unique (student_id, topic_id)
);

ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own topic progress"
  ON public.topic_progress FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own topic progress"
  ON public.topic_progress FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own topic progress"
  ON public.topic_progress FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Admin can view all topic progress"
  ON public.topic_progress FOR SELECT USING (public.is_admin());

-- 2. Add quizzes policy for admin
CREATE POLICY "Admin can manage quizzes"
  ON public.quizzes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
