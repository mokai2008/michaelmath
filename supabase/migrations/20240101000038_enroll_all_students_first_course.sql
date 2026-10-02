-- ============================================================
-- 1. ADD COMPATIBILITY COLUMNS (Prevents column missing errors)
-- ============================================================

-- Add created_at to enrollments if missing, and sync from enrolled_at
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
UPDATE public.enrollments SET created_at = enrolled_at WHERE created_at IS NULL;

-- Add title to quizzes if missing, and sync from topics.title
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS title text;
UPDATE public.quizzes q
SET title = t.title
FROM public.topics t
WHERE q.topic_id = t.id AND (q.title IS NULL OR q.title = '');

-- ============================================================
-- 2. ENSURE ADMIN HAS FULL PERMISSION TO MANAGE ENROLLMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admin can manage all enrollments" ON public.enrollments;
CREATE POLICY "Admin can manage all enrollments"
  ON public.enrollments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. AUTO-ENROLL ALL EXISTING STUDENTS INTO 1ST ACADEMY COURSE
-- ============================================================
DO $$
DECLARE
  v_first_course_id uuid;
BEGIN
  -- Get the earliest created course ID
  SELECT id INTO v_first_course_id 
  FROM public.courses 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_first_course_id IS NOT NULL THEN
    -- Enroll every non-admin student into this course
    INSERT INTO public.enrollments (student_id, course_id, enrolled_at, created_at)
    SELECT p.id, v_first_course_id, now(), now()
    FROM public.profiles p
    WHERE (p.role IS DISTINCT FROM 'admin')
      AND (p.email IS DISTINCT FROM 'mokai2008@gmail.com')
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 4. VERIFY: LIST ENROLLED STUDENTS
-- ============================================================
SELECT 
  p.full_name,
  p.email,
  p.student_code,
  c.title AS enrolled_course,
  e.enrolled_at
FROM public.enrollments e
JOIN public.profiles p ON p.id = e.student_id
JOIN public.courses c ON c.id = e.course_id
ORDER BY e.enrolled_at DESC;


