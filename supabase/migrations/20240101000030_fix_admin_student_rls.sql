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
