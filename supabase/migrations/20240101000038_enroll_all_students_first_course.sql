-- Automatically enroll all existing registered students into the first created course
DO $$
DECLARE
  v_first_course_id uuid;
BEGIN
  -- Get the earliest created course
  SELECT id INTO v_first_course_id 
  FROM public.courses 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_first_course_id IS NOT NULL THEN
    -- Enroll every non-admin student into this course
    INSERT INTO public.enrollments (student_id, course_id, enrolled_at)
    SELECT p.id, v_first_course_id, now()
    FROM public.profiles p
    WHERE (p.role IS DISTINCT FROM 'admin')
      AND (p.email IS DISTINCT FROM 'mokai2008@gmail.com')
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;
END $$;
