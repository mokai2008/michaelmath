CREATE TABLE IF NOT EXISTS public.worksheet_submissions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  file_url text not null,
  submitted_at timestamptz default now() not null,
  unique(student_id, topic_id)
);

ALTER TABLE public.worksheet_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own worksheet submissions"
  ON public.worksheet_submissions FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own worksheet submissions"
  ON public.worksheet_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own worksheet submissions"
  ON public.worksheet_submissions FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Admin can view all worksheet submissions"
  ON public.worksheet_submissions FOR SELECT USING (public.is_admin());
