-- 1. Update handle_new_user to give $5 welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, wallet_balance)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 5.00);
  
  -- Record the welcome bonus transaction
  INSERT INTO public.wallet_transactions (student_id, type, amount, description)
  VALUES (new.id, 'topup', 5.00, 'Welcome bonus - free $5 on signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- 2. Students can read their own wallet_transactions
CREATE POLICY "Users can read own wallet transactions."
  ON public.wallet_transactions FOR SELECT USING (auth.uid() = student_id);

-- 3. Students can insert wallet_transactions for themselves  
CREATE POLICY "Users can insert own wallet transactions."
  ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 4. Students can read their own section_purchases
CREATE POLICY "Users can read own section purchases."
  ON public.section_purchases FOR SELECT USING (auth.uid() = student_id);

-- 5. Students can insert section_purchases
CREATE POLICY "Users can insert own purchases."
  ON public.section_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 6. Admin can manage wallet_transactions
DROP POLICY IF EXISTS "Admin can manage wallet_transactions." ON public.wallet_transactions;
CREATE POLICY "Admin can manage wallet_transactions."
  ON public.wallet_transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Admin can manage section_purchases
DROP POLICY IF EXISTS "Admin can manage section_purchases." ON public.section_purchases;
CREATE POLICY "Admin can manage section_purchases."
  ON public.section_purchases FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Admin can UPDATE profiles (for wallet credits)
CREATE POLICY "Admin can update all profiles."
  ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
