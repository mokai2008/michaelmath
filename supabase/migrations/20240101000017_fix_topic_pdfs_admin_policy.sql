-- Add missing admin write policy for topic_pdfs table
-- Previously only had a SELECT policy for students, no INSERT/UPDATE/DELETE for admin
CREATE POLICY "Admin can manage topic_pdfs."
  ON public.topic_pdfs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
