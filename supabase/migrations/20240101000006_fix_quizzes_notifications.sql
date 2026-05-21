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
