-- ==============================================================================
-- File 1/32: 20240101000000_initial_schema.sql
-- ==============================================================================

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
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- File 2/32: 20240101000001_add_quiz_data.sql
-- ==============================================================================

-- Add questions_data JSONB column to support interactive quiz maker
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS questions_data JSONB;

-- ==============================================================================
-- File 3/32: 20240101000002_live_sessions_upgrade.sql
-- ==============================================================================

-- Live Sessions Upgrade: Invitations + Booking System
-- =====================================================

-- 1. Add status to live_session_enrollments for invitation flow
-- Status values: 'invited', 'accepted', 'declined'
ALTER TABLE public.live_session_enrollments 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'invited' NOT NULL,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- 2. Admin availability slots (predetermined schedule)
CREATE TABLE IF NOT EXISTS public.admin_availability_slots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 3. Booking requests from students
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  slot_id uuid REFERENCES public.admin_availability_slots(id) ON DELETE CASCADE NOT NULL,
  requested_date date NOT NULL,
  requested_start_time time NOT NULL,
  notes text,
  status text DEFAULT 'pending' NOT NULL,
  -- Status values: 'pending', 'approved', 'rejected'
  admin_response text,
  session_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  -- Linked after admin approves and creates a session
  created_at timestamptz DEFAULT now() NOT NULL,
  responded_at timestamptz
);

-- RLS
ALTER TABLE public.admin_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view active availability slots (public schedule)
CREATE POLICY "Anyone can view active availability slots."
  ON public.admin_availability_slots FOR SELECT USING (is_active = true);

-- Students can view their own booking requests
CREATE POLICY "Students can view own booking requests."
  ON public.booking_requests FOR SELECT USING (auth.uid() = student_id);

-- Students can create booking requests
CREATE POLICY "Students can create booking requests."
  ON public.booking_requests FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can insert their own enrollment (for accepting invites)
CREATE POLICY "Students can insert own session enrollments."
  ON public.live_session_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own enrollment status (accept/decline)
CREATE POLICY "Students can update own session enrollment status."
  ON public.live_session_enrollments FOR UPDATE USING (auth.uid() = student_id);

-- Allow students to view all upcoming live sessions (needed for the booking flow)
CREATE POLICY "Students can view upcoming live sessions."
  ON public.live_sessions FOR SELECT USING (true);

-- ==============================================================================
-- File 4/32: 20240101000003_admin_rls_policies.sql
-- ==============================================================================

-- Admin RLS Policies
-- ==================
-- Creates a helper function to check if the current user is an admin,
-- then adds INSERT/UPDATE/DELETE/SELECT policies for admin-managed tables.

-- Helper: check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- live_sessions: admin full access
CREATE POLICY "Admin can do anything with live_sessions."
  ON public.live_sessions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- live_session_enrollments: admin full access (for inviting students)
CREATE POLICY "Admin can manage all session enrollments."
  ON public.live_session_enrollments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- admin_availability_slots: admin full access (manage schedule)
CREATE POLICY "Admin can manage availability slots."
  ON public.admin_availability_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- booking_requests: admin can view and update all
CREATE POLICY "Admin can view all booking requests."
  ON public.booking_requests FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update booking requests."
  ON public.booking_requests FOR UPDATE USING (public.is_admin());

-- courses: admin full access
CREATE POLICY "Admin can manage courses."
  ON public.courses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sections: admin full access
CREATE POLICY "Admin can manage sections."
  ON public.sections FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- topics: admin full access
CREATE POLICY "Admin can manage topics."
  ON public.topics FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles: admin can view all
CREATE POLICY "Admin can view all profiles."
  ON public.profiles FOR SELECT USING (public.is_admin());

-- notifications: admin can insert for any student
CREATE POLICY "Admin can insert notifications."
  ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

-- ==============================================================================
-- File 5/32: 20240101000004_slot_date_and_fix.sql
-- ==============================================================================

-- Add specific date to availability slots
ALTER TABLE public.admin_availability_slots
  ADD COLUMN IF NOT EXISTS slot_date date;

-- Update booking_requests: ensure admin can update with WITH CHECK
DROP POLICY IF EXISTS "Admin can update booking requests." ON public.booking_requests;
CREATE POLICY "Admin can update booking requests."
  ON public.booking_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- File 6/32: 20240101000005_add_progress_tracking.sql
-- ==============================================================================

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

-- ==============================================================================
-- File 7/32: 20240101000006_fix_quizzes_notifications.sql
-- ==============================================================================

-- Fix student access to quizzes
DROP POLICY IF EXISTS "Students can view quizzes" ON public.quizzes;
CREATE POLICY "Students can view quizzes"
  ON public.quizzes FOR SELECT USING (true);

-- Also ensure students can insert their own quiz submissions
DROP POLICY IF EXISTS "Students can insert own quiz submissions" ON public.quiz_submissions;
CREATE POLICY "Students can insert own quiz submissions"
  ON public.quiz_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view own quiz submissions" ON public.quiz_submissions;
CREATE POLICY "Students can view own quiz submissions"
  ON public.quiz_submissions FOR SELECT USING (auth.uid() = student_id);

-- Also add policy for admin to view all quiz submissions
DROP POLICY IF EXISTS "Admin can view all quiz submissions" ON public.quiz_submissions;
CREATE POLICY "Admin can view all quiz submissions"
  ON public.quiz_submissions FOR SELECT USING (public.is_admin());

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Admin can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can view all notifications" ON public.notifications;
CREATE POLICY "Admin can view all notifications"
  ON public.notifications FOR SELECT USING (public.is_admin());

-- ==============================================================================
-- File 8/32: 20240101000007_add_notification_fields.sql
-- ==============================================================================

-- Add title and link_url to notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS link_url text;

-- ==============================================================================
-- File 9/32: 20240101000008_booking_requests_set_null.sql
-- ==============================================================================

-- Update booking_requests to preserve history when admin deletes slots
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_slot_id_fkey,
  ALTER COLUMN slot_id DROP NOT NULL,
  ADD CONSTRAINT booking_requests_slot_id_fkey
    FOREIGN KEY (slot_id) REFERENCES public.admin_availability_slots(id) ON DELETE SET NULL;

-- ==============================================================================
-- File 10/32: 20240101000009_update_reminders_table.sql
-- ==============================================================================

ALTER TABLE public.reminders ADD COLUMN title text;
ALTER TABLE public.reminders ADD COLUMN day text;

-- ==============================================================================
-- File 11/32: 20240101000010_add_date_to_reminders.sql
-- ==============================================================================

ALTER TABLE public.reminders ADD COLUMN date date;

-- ==============================================================================
-- File 12/32: 20240101000011_add_settings_table.sql
-- ==============================================================================

CREATE TABLE public.platform_settings (
  id integer primary key default 1,
  stripe_secret_key text,
  openai_api_key text,
  updated_at timestamptz default now() not null
);

-- Ensure only one row exists
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_single_row CHECK (id = 1);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings for API routes using service role, but for client side, admins only
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::user_role)
);

-- ==============================================================================
-- File 13/32: 20240101000012_advanced_quiz_features.sql
-- ==============================================================================

-- Add advanced quiz features: time limit, passing score, and settings
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"shuffle_questions": false, "shuffle_options": false}'::JSONB;

-- ==============================================================================
-- File 14/32: 20240101000013_create_course_assets_bucket.sql
-- ==============================================================================

DROP POLICY IF EXISTS "course_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_delete" ON storage.objects;

-- Create the course-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-assets', 'course-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to course-assets
CREATE POLICY "course_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-assets');

-- Allow authenticated users to upload to course-assets
CREATE POLICY "course_assets_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-assets');

-- Allow authenticated users to update files in course-assets
CREATE POLICY "course_assets_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-assets');

-- Allow authenticated users to delete files from course-assets
CREATE POLICY "course_assets_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-assets');

-- ==============================================================================
-- File 15/32: 20240101000014_add_worksheet_submission_url.sql
-- ==============================================================================

ALTER TABLE public.topic_progress
ADD COLUMN IF NOT EXISTS worksheet_answers_url text;

-- ==============================================================================
-- File 16/32: 20240101000015_create_worksheet_submissions.sql
-- ==============================================================================

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

-- ==============================================================================
-- File 17/32: 20240101000016_create_manual_submissions.sql
-- ==============================================================================

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

-- ==============================================================================
-- File 18/32: 20240101000017_fix_topic_pdfs_admin_policy.sql
-- ==============================================================================

-- Add missing admin write policy for topic_pdfs table
-- Previously only had a SELECT policy for students, no INSERT/UPDATE/DELETE for admin
CREATE POLICY "Admin can manage topic_pdfs."
  ON public.topic_pdfs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- File 19/32: 20240101000018_admin_notifications.sql
-- ==============================================================================

-- Admin notifications table for tracking student performance events
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'quiz_completed', 'worksheet_submitted', 'pdf_quiz_submitted'
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with admin_notifications
CREATE POLICY "Admin can manage admin_notifications."
  ON public.admin_notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Students can insert admin notifications (for notifying admin about their submissions)
CREATE POLICY "Students can insert admin_notifications."
  ON public.admin_notifications FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ==============================================================================
-- File 20/32: 20240101000019_wallet_system.sql
-- ==============================================================================

-- 1. Update handle_new_user to give $5 welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 5.00);
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 2. Students can read their own wallet_transactions
CREATE POLICY "Users can read own wallet transactions."
  ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id);

-- 3. Students can insert wallet_transactions for themselves  
CREATE POLICY "Users can insert own wallet transactions."
  ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 4. Students can read their own section_purchases
CREATE POLICY "Users can read own section purchases."
  ON public.section_purchases FOR SELECT USING (auth.uid() = student_id);

-- 5. Students can insert section_purchases
CREATE POLICY "Users can insert own purchases."
  ON public.section_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 6. Admin can manage wallet_transactions
DROP POLICY IF EXISTS "Admin can manage wallet_transactions." ON public.wallet_transactions;
CREATE POLICY "Admin can manage wallet_transactions."
  ON public.wallet_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Admin can manage section_purchases
DROP POLICY IF EXISTS "Admin can manage section_purchases." ON public.section_purchases;
CREATE POLICY "Admin can manage section_purchases."
  ON public.section_purchases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Admin can UPDATE profiles (for wallet credits)
CREATE POLICY "Admin can update all profiles."
  ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- File 21/32: 20240101000020_student_code.sql
-- ==============================================================================

-- Add unique student code to profiles for admin lookup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;

-- Generate codes for existing students
UPDATE public.profiles
SET student_code = 'MG-' || UPPER(SUBSTR(md5(id::text), 1, 6))
WHERE student_code IS NULL;

-- Update handle_new_user to auto-generate student_code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6))
  );
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- ==============================================================================
-- File 22/32: 20240101000021_slots_booking_price.sql
-- ==============================================================================

-- ============================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Add booking functionality to admin_availability_slots
-- ============================================

-- 1. Add price and is_booked columns to admin_availability_slots
ALTER TABLE public.admin_availability_slots 
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_booked boolean DEFAULT false;

-- 2. Ensure anyone can see active and unbooked slots
DROP POLICY IF EXISTS "Anyone can view active availability slots." ON public.admin_availability_slots;
CREATE POLICY "Anyone can view active availability slots."
  ON public.admin_availability_slots FOR SELECT USING (is_active = true);

-- 3. Allow admins to update the slots (already covered by RLS, but let's make sure)
-- Just ensuring admins can modify slots entirely
DROP POLICY IF EXISTS "Admin can manage availability slots." ON public.admin_availability_slots;
CREATE POLICY "Admin can manage availability slots."
  ON public.admin_availability_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- File 23/32: 20240101000022_book_slot_rpc.sql
-- ==============================================================================

-- ============================================
-- SQL for secure slot booking (bypasses RLS for wallet/slot update)
-- ============================================

CREATE OR REPLACE FUNCTION public.book_availability_slot(
  p_slot_id uuid, 
  p_student_id uuid, 
  p_booking_date date, 
  p_notes text
)
RETURNS public.booking_requests AS $$
DECLARE
  v_price numeric;
  v_balance numeric;
  v_start_time time;
  v_is_booked boolean;
  v_booking public.booking_requests;
BEGIN
  -- 1. Check if slot exists and is available
  SELECT price, is_booked, start_time INTO v_price, v_is_booked, v_start_time 
  FROM public.admin_availability_slots 
  WHERE id = p_slot_id;
  
  IF v_is_booked THEN
    RAISE EXCEPTION 'Slot is already booked';
  END IF;

  -- 2. Check student wallet balance
  SELECT wallet_balance INTO v_balance 
  FROM public.profiles 
  WHERE id = p_student_id;
  
  IF v_price > 0 THEN
    IF v_balance < v_price THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Deduct wallet
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - v_price 
    WHERE id = p_student_id;
    
    -- Record transaction
    INSERT INTO public.wallet_transactions (student_id, type, amount, description) 
    VALUES (p_student_id, 'purchase', v_price, 'Booked session slot');
  END IF;
  
  -- 3. Mark slot as booked
  UPDATE public.admin_availability_slots 
  SET is_booked = true 
  WHERE id = p_slot_id;
  
  -- 4. Create booking request
  INSERT INTO public.booking_requests (student_id, slot_id, requested_date, requested_start_time, notes, status)
  VALUES (p_student_id, p_slot_id, p_booking_date, v_start_time, p_notes, 'pending')
  RETURNING * INTO v_booking;
  
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- File 24/32: 20240101000023_add_recording_url.sql
-- ==============================================================================

-- Add recording_url to live_sessions
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS recording_url text;

-- ==============================================================================
-- File 25/32: 20240101000024_add_course_keywords.sql
-- ==============================================================================

-- Add keywords array to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];

-- ==============================================================================
-- File 26/32: 20240101000025_fix_profiles_and_trigger.sql
-- ==============================================================================

-- ============================================
-- FIX: Add missing student_whatsapp column to profiles
-- and ensure the handle_new_user trigger works correctly
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Add student_whatsapp column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_whatsapp TEXT;

-- 2. Recreate the handle_new_user trigger function with all required columns
-- This function runs when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6)),
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END
  );
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
EXCEPTION WHEN others THEN
  -- If the trigger fails (e.g. duplicate key), log and continue
  -- so the auth.users row is still created
  RAISE WARNING 'handle_new_user failed for %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Ensure RLS policy allows INSERT on profiles for the trigger (runs as security definer, but just in case)
-- The trigger runs with SECURITY DEFINER so it bypasses RLS, but let's also ensure
-- the profiles INSERT policy exists for fallback scenarios
DROP POLICY IF EXISTS "Service role can insert profiles." ON public.profiles;

-- 5. Fix admin profile if it exists but has wrong role
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'mokai2008@gmail.com' AND role != 'admin'::user_role;

-- 6. If admin profile is completely missing, create it
INSERT INTO public.profiles (id, full_name, email, role, wallet_balance, student_code)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Michael Gad'), 
  email, 
  'admin'::user_role,
  0.00,
  'MG-ADMIN'
FROM auth.users
WHERE email = 'mokai2008@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role;

-- ==============================================================================
-- File 27/32: 20240101000026_add_intro_video_url_to_courses.sql
-- ==============================================================================

-- Add intro_video_url to courses table for course entrance/preview video
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intro_video_url text;

-- ==============================================================================
-- File 28/32: 20240101000027_add_canva_embed_code_to_quizzes.sql
-- ==============================================================================

-- Add embed_code column to quizzes table to support Canva AI and custom HTML embed quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS embed_code text;

-- ==============================================================================
-- File 29/32: 20240101000028_add_content_items_to_topics.sql
-- ==============================================================================

-- Add content_items column to topics table to support multiple videos, quizzes, worksheets, and notes per lesson
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS content_items jsonb DEFAULT '[]'::jsonb;

-- ==============================================================================
-- File 30/32: 20240101000029_create_video_server_opens.sql
-- ==============================================================================

-- Create video_server_opens table for tracking video opens per server mirror
CREATE TABLE IF NOT EXISTS public.video_server_opens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  content_item_id text,
  server_index integer DEFAULT 0 NOT NULL,
  server_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.video_server_opens ENABLE ROW LEVEL SECURITY;

-- Allow students/authenticated users to record their video opens
DROP POLICY IF EXISTS "Users can insert own video server opens" ON public.video_server_opens;
CREATE POLICY "Users can insert own video server opens"
  ON public.video_server_opens FOR INSERT WITH CHECK (auth.uid() = student_id OR student_id IS NULL);

-- Allow admins full access to view video server opens
DROP POLICY IF EXISTS "Admin can view all video server opens" ON public.video_server_opens;
CREATE POLICY "Admin can view all video server opens"
  ON public.video_server_opens FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete video server opens" ON public.video_server_opens;
CREATE POLICY "Admin can delete video server opens"
  ON public.video_server_opens FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- File 31/32: 20240101000030_fix_admin_student_rls.sql
-- ==============================================================================

-- Fix RLS Policies for Admin Access to Profiles and Student Records

-- 1. Profiles table SELECT policy for Admin & Users
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Admin and users can view profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin() OR auth.uid() = id OR role = 'student'::user_role OR role IS NULL);

-- 2. Enrollments table SELECT policy for Admin
DROP POLICY IF EXISTS "Admin can view all enrollments." ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments." ON public.enrollments;
CREATE POLICY "Admin and users can view enrollments"
  ON public.enrollments FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

-- 3. Topic Progress table SELECT policy for Admin
DROP POLICY IF EXISTS "Admin can view all topic progress." ON public.topic_progress;
DROP POLICY IF EXISTS "Students can view own topic progress" ON public.topic_progress;
CREATE POLICY "Admin and users can view topic progress"
  ON public.topic_progress FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

-- 4. Manual Submissions table SELECT policy for Admin
DROP POLICY IF EXISTS "Admin can view all manual submissions." ON public.manual_submissions;
DROP POLICY IF EXISTS "Students can view own manual submissions" ON public.manual_submissions;
CREATE POLICY "Admin and users can view manual submissions"
  ON public.manual_submissions FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

-- 5. Quiz Submissions table SELECT policy for Admin
DROP POLICY IF EXISTS "Admin can view all quiz submissions." ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can view own quiz submissions." ON public.quiz_submissions;
CREATE POLICY "Admin and users can view quiz submissions"
  ON public.quiz_submissions FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

-- ==============================================================================
-- File 32/32: RUN_THIS_NOW.sql
-- ==============================================================================

-- ============================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Add student_code column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;

-- 2. Generate codes for existing students
UPDATE public.profiles
SET student_code = 'MG-' || UPPER(SUBSTR(md5(id::text), 1, 6))
WHERE student_code IS NULL;

-- 3. Update signup trigger: $5 welcome bonus + student code
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance, student_code, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    5.00,
    'MG-' || UPPER(SUBSTR(md5(new.id::text), 1, 6)),
    CASE WHEN new.email = 'mokai2008@gmail.com' THEN 'admin'::user_role ELSE 'student'::user_role END
  );
  
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 4. Students can READ their own wallet transactions
DROP POLICY IF EXISTS "Users can read own wallet transactions." ON public.wallet_transactions;
CREATE POLICY "Users can read own wallet transactions."
  ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id);

-- 5. Students can INSERT wallet transactions
DROP POLICY IF EXISTS "Users can insert own wallet transactions." ON public.wallet_transactions;
CREATE POLICY "Users can insert own wallet transactions."
  ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 6. Students can READ their own section purchases
DROP POLICY IF EXISTS "Users can read own section purchases." ON public.section_purchases;
CREATE POLICY "Users can read own section purchases."
  ON public.section_purchases FOR SELECT USING (auth.uid() = student_id);

-- 7. Students can INSERT section purchases
DROP POLICY IF EXISTS "Users can insert own purchases." ON public.section_purchases;
CREATE POLICY "Users can insert own purchases."
  ON public.section_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 8. Admin can manage wallet_transactions
DROP POLICY IF EXISTS "Admin can manage wallet_transactions." ON public.wallet_transactions;
CREATE POLICY "Admin can manage wallet_transactions."
  ON public.wallet_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Admin can manage section_purchases
DROP POLICY IF EXISTS "Admin can manage section_purchases." ON public.section_purchases;
CREATE POLICY "Admin can manage section_purchases."
  ON public.section_purchases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. Admin can UPDATE profiles (for wallet credits)
DROP POLICY IF EXISTS "Admin can update all profiles." ON public.profiles;
CREATE POLICY "Admin can update all profiles."
  ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. Students can UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 12. Students can read their own profile
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
CREATE POLICY "Users can view own profile."
  ON public.profiles FOR SELECT USING (auth.uid() = id);
-- ============================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Add booking functionality to admin_availability_slots
-- ============================================

-- 1. Add price and is_booked columns to admin_availability_slots
ALTER TABLE public.admin_availability_slots 
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_booked boolean DEFAULT false;

-- 2. Ensure anyone can see active and unbooked slots
DROP POLICY IF EXISTS "Anyone can view active availability slots." ON public.admin_availability_slots;
CREATE POLICY "Anyone can view active availability slots."
  ON public.admin_availability_slots FOR SELECT USING (is_active = true);

-- 3. Allow admins to update the slots (already covered by RLS, but let's make sure)
-- Just ensuring admins can modify slots entirely
DROP POLICY IF EXISTS "Admin can manage availability slots." ON public.admin_availability_slots;
CREATE POLICY "Admin can manage availability slots."
  ON public.admin_availability_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Add keywords and intro_video_url to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intro_video_url text;

-- 5. Add content_items jsonb to topics table
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS content_items jsonb DEFAULT '[]'::jsonb;

-- 6. Create video_server_opens table for tracking video opens per server mirror
CREATE TABLE IF NOT EXISTS public.video_server_opens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  content_item_id text,
  server_index integer DEFAULT 0 NOT NULL,
  server_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.video_server_opens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own video server opens" ON public.video_server_opens;
CREATE POLICY "Users can insert own video server opens"
  ON public.video_server_opens FOR INSERT WITH CHECK (auth.uid() = student_id OR student_id IS NULL);

DROP POLICY IF EXISTS "Admin can view all video server opens" ON public.video_server_opens;
CREATE POLICY "Admin can view all video server opens"
  ON public.video_server_opens FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete video server opens" ON public.video_server_opens;
CREATE POLICY "Admin can delete video server opens"
  ON public.video_server_opens FOR DELETE USING (public.is_admin());

-- 7. Fix RLS policies to allow Admins to view all student profiles and records
DROP POLICY IF EXISTS "Users can view own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Admin and users can view profiles" ON public.profiles;

CREATE POLICY "Admin and users can view profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin() OR auth.uid() = id OR role = 'student'::user_role OR role IS NULL);

DROP POLICY IF EXISTS "Admin can view all enrollments." ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments." ON public.enrollments;
DROP POLICY IF EXISTS "Admin and users can view enrollments" ON public.enrollments;

CREATE POLICY "Admin and users can view enrollments"
  ON public.enrollments FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin can view all topic progress." ON public.topic_progress;
DROP POLICY IF EXISTS "Students can view own topic progress" ON public.topic_progress;
DROP POLICY IF EXISTS "Admin and users can view topic progress" ON public.topic_progress;

CREATE POLICY "Admin and users can view topic progress"
  ON public.topic_progress FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin can view all manual submissions." ON public.manual_submissions;
DROP POLICY IF EXISTS "Students can view own manual submissions" ON public.manual_submissions;
DROP POLICY IF EXISTS "Admin and users can view manual submissions" ON public.manual_submissions;

CREATE POLICY "Admin and users can view manual submissions"
  ON public.manual_submissions FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin can view all quiz submissions." ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can view own quiz submissions." ON public.quiz_submissions;
DROP POLICY IF EXISTS "Admin and users can view quiz submissions" ON public.quiz_submissions;

CREATE POLICY "Admin and users can view quiz submissions"
  ON public.quiz_submissions FOR SELECT
  USING (public.is_admin() OR auth.uid() = student_id);

