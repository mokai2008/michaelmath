import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (token_hash && type) {
    // Email confirmation via token hash (magic link / email OTP)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (!error) {
      // Successfully verified — redirect to login
      return NextResponse.redirect(new URL('/login', requestUrl.origin));
    }
  }

  if (code) {
    // OAuth or PKCE code exchange
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL('/login', requestUrl.origin));
    }
  }

  // If verification failed, redirect to login with an error message
  return NextResponse.redirect(
    new URL('/login?error=verification_failed', requestUrl.origin)
  );
}
