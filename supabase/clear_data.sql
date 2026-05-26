-- ====================================================================
-- SQL SCRIPT TO WIPE ALL COURSE AND STUDENT DATA
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ====================================================================

-- 1. Disable triggers temporarily to prevent side-effects during deletion
SET session_replication_role = 'replica';

-- 2. Clear all course-related and academic tables
-- (Cascade will handle sections, topics, pdfs, quizzes, quiz_submissions, enrollments, section_purchases, earnings, etc.)
DELETE FROM public.courses;

-- 3. Clear other app data tables
DELETE FROM public.wallet_transactions;
DELETE FROM public.live_session_enrollments;
DELETE FROM public.live_sessions;
DELETE FROM public.admin_availability_slots;
DELETE FROM public.booking_requests;
DELETE FROM public.worksheet_submissions;
DELETE FROM public.manual_submissions;
DELETE FROM public.reminders;
DELETE FROM public.notifications;
DELETE FROM public.chat_logs;
DELETE FROM public.chat_usage;
DELETE FROM public.parent_reports;

-- 4. Delete all auth users EXCEPT the admin email
DELETE FROM auth.users WHERE email != 'mokai2008@gmail.com';

-- 5. Re-enable triggers
SET session_replication_role = 'origin';

-- 6. Ensure the admin user profile is configured correctly if it exists
UPDATE public.profiles 
SET 
  role = 'admin'::user_role,
  wallet_balance = 0.00
WHERE email = 'mokai2008@gmail.com';

-- 7. (Optional) Force the new signup function code to register
-- This ensures that when 'mokai2008@gmail.com' signs up, they are automatically granted the 'admin' role.
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
