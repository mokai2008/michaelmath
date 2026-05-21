CREATE TABLE IF NOT EXISTS public.manual_submissions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  type text not null, -- 'worksheet' or 'pdf_quiz'
  file_url text not null,
  status text default 'pending' not null, -- 'pending', 'reviewed'
  score numeric(5, 2),
  feedback_text text,
  feedback_file_url text,
  submitted_at timestamptz default now() not null,
  reviewed_at timestamptz
);

ALTER TABLE public.manual_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own manual submissions"
  ON public.manual_submissions FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own manual submissions"
  ON public.manual_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own manual submissions"
  ON public.manual_submissions FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Admin can manage all manual submissions"
  ON public.manual_submissions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
