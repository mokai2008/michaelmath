-- ====================================================================
-- SQL SCRIPT TO WIPE ALL COURSE AND STUDENT DATA
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ====================================================================

-- 1. Disable triggers temporarily to prevent side-effects during deletion
SET session_replication_role = 'replica';

-- 2. Clear all tables safely, checking if they exist first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    DELETE FROM public.courses;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    DELETE FROM public.wallet_transactions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_session_enrollments') THEN
    DELETE FROM public.live_session_enrollments;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_sessions') THEN
    DELETE FROM public.live_sessions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_availability_slots') THEN
    DELETE FROM public.admin_availability_slots;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_requests') THEN
    DELETE FROM public.booking_requests;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'worksheet_submissions') THEN
    DELETE FROM public.worksheet_submissions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'manual_submissions') THEN
    DELETE FROM public.manual_submissions;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reminders') THEN
    DELETE FROM public.reminders;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_logs') THEN
    DELETE FROM public.chat_logs;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_usage') THEN
    DELETE FROM public.chat_usage;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_reports') THEN
    DELETE FROM public.parent_reports;
  END IF;
END $$;

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
