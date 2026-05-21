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
