-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE pdf_type AS ENUM ('notes', 'worksheet');
CREATE TYPE quiz_type AS ENUM ('topic', 'cumulative');
CREATE TYPE transaction_type AS ENUM ('topup', 'purchase', 'refund');
CREATE TYPE earning_type AS ENUM ('course', 'section', 'session');

-- 1. profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users on delete cascade not null primary key,
  full_name text,
  email text not null,
  avatar_url text,
  role user_role default 'student'::user_role not null,
  parent_email text,
  parent_whatsapp text,
  wallet_balance numeric(10, 2) default 0.00 not null,
  created_at timestamptz default now() not null
);

-- 2. courses
CREATE TABLE public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  total_price numeric(10, 2) default 0.00 not null,
  is_published boolean default false not null,
  created_at timestamptz default now() not null
);

-- 3. sections
CREATE TABLE public.sections (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  price numeric(10, 2) default 0.00 not null,
  created_at timestamptz default now() not null
);

-- 4. topics
CREATE TABLE public.topics (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  youtube_url text,
  created_at timestamptz default now() not null
);

-- 5. topic_pdfs
CREATE TABLE public.topic_pdfs (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid references public.topics(id) on delete cascade not null,
  type pdf_type not null,
  file_url text not null,
  created_at timestamptz default now() not null
);

-- 6. quizzes
CREATE TABLE public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid references public.topics(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  type quiz_type not null,
  quiz_pdf_url text,
  markscheme_pdf_url text,
  total_marks integer not null default 0,
  created_at timestamptz default now() not null
);

-- 7. quiz_submissions
CREATE TABLE public.quiz_submissions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  score numeric(5, 2) not null,
  submitted_at timestamptz default now() not null,
  answers_data jsonb
);

-- 8. enrollments
CREATE TABLE public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  enrolled_at timestamptz default now() not null,
  unique (student_id, course_id)
);

-- 9. section_purchases
CREATE TABLE public.section_purchases (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  section_id uuid references public.sections(id) on delete cascade not null,
  purchased_at timestamptz default now() not null,
  amount_paid numeric(10, 2) not null default 0.00,
  unique (student_id, section_id)
);

-- 10. wallet_transactions
CREATE TABLE public.wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  type transaction_type not null,
  amount numeric(10, 2) not null,
  description text,
  created_at timestamptz default now() not null
);

-- 11. live_sessions
CREATE TABLE public.live_sessions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  course_id uuid references public.courses(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  meeting_url text,
  price numeric(10, 2) default 0.00 not null,
  created_at timestamptz default now() not null
);

-- 12. live_session_enrollments
CREATE TABLE public.live_session_enrollments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.live_sessions(id) on delete cascade not null,
  enrolled_at timestamptz default now() not null,
  unique (student_id, session_id)
);

-- 13. reminders
CREATE TABLE public.reminders (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  whatsapp_number text,
  reminder_time time not null,
  days_of_week text[] not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

-- 14. notifications
CREATE TABLE public.notifications (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  type text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- 15. earnings
CREATE TABLE public.earnings (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null,
  type earning_type not null,
  created_at timestamptz default now() not null
);

-- 16. parent_reports
CREATE TABLE public.parent_reports (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  sent_at timestamptz default now() not null,
  report_data jsonb,
  whatsapp_sent boolean default false not null,
  email_sent boolean default false not null
);

-- 17. chat_logs
CREATE TABLE public.chat_logs (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  messages jsonb not null,
  context jsonb,
  topic_id uuid references public.topics(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- 18. chat_usage
CREATE TABLE public.chat_usage (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  window_start timestamptz not null,
  message_count integer default 0 not null
);

-- RLS Setup (Basic Templates)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- Allow public read access to courses
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Public content reading
CREATE POLICY "Public can view published courses." ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view course sections." ON public.sections FOR SELECT USING (true);
CREATE POLICY "Students can view topics for their enrolled courses/sections." ON public.topics FOR SELECT USING (true); -- Real implementation would check enrollments
CREATE POLICY "Students can view pdfs." ON public.topic_pdfs FOR SELECT USING (true);
CREATE POLICY "Students can view quizzes." ON public.quizzes FOR SELECT USING (true);

-- Student data access (own data only)
CREATE POLICY "Users can view own quiz submissions." ON public.quiz_submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert own quiz submissions." ON public.quiz_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can view own enrollments." ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can enroll themselves." ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can view own purchases." ON public.section_purchases FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can view own wallet transactions." ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can view own live session enrollments." ON public.live_session_enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can manage own reminders." ON public.reminders FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Users can view own notifications." ON public.notifications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can view own chat logs." ON public.chat_logs FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert own chat logs." ON public.chat_logs FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can view own chat usage." ON public.chat_usage FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can update own chat usage." ON public.chat_usage FOR UPDATE USING (auth.uid() = student_id);

-- Profile trigger to create a new profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
