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
