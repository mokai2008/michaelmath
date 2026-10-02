-- ============================================
-- BACKFILL: Sync WhatsApp numbers from auth.users metadata into profiles
-- Run this in your Supabase SQL Editor (187.77.97.9:8000)
-- ============================================

-- First, let's see what metadata exists in auth.users
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' AS meta_full_name,
  u.raw_user_meta_data->>'student_whatsapp' AS meta_student_whatsapp,
  u.raw_user_meta_data->>'parent_whatsapp' AS meta_parent_whatsapp,
  u.raw_user_meta_data->>'parent_email' AS meta_parent_email,
  p.student_whatsapp AS current_student_whatsapp,
  p.parent_whatsapp AS current_parent_whatsapp
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

-- Then sync: Update profiles with metadata from auth.users where profiles has NULL/empty values
UPDATE public.profiles p
SET 
  student_whatsapp = COALESCE(
    NULLIF(p.student_whatsapp, ''),  -- keep existing non-empty value
    NULLIF(u.raw_user_meta_data->>'student_whatsapp', '')  -- use metadata if profiles is empty
  ),
  parent_whatsapp = COALESCE(
    NULLIF(p.parent_whatsapp, ''),
    NULLIF(u.raw_user_meta_data->>'parent_whatsapp', '')
  ),
  parent_email = COALESCE(
    NULLIF(p.parent_email, ''),
    NULLIF(u.raw_user_meta_data->>'parent_email', '')
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    (p.student_whatsapp IS NULL OR p.student_whatsapp = '')
    OR (p.parent_whatsapp IS NULL OR p.parent_whatsapp = '')
  );
