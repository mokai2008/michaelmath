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
