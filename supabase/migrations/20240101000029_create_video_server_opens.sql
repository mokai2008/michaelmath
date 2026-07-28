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
