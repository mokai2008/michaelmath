import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');

  // If this is password recovery or explicitly targeted at /reset-password, forward all query params directly
  // to /reset-password so the browser client Supabase session can be established
  if (type === 'recovery' || next === '/reset-password' || next?.startsWith('/reset-password')) {
    const redirectUrl = new URL('/reset-password', requestUrl.origin);
    requestUrl.searchParams.forEach((val, key) => {
      if (key !== 'next') {
        redirectUrl.searchParams.set(key, val);
      }
    });
    return NextResponse.redirect(redirectUrl);
  }

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
      // Successfully verified — redirect to login or next destination
      return NextResponse.redirect(new URL(next || '/login?message=verified', requestUrl.origin));
    }
  }

  if (code) {
    // If next destination is customized, forward with code to let client or destination handle it
    if (next && next !== '/login') {
      const redirectUrl = new URL(next, requestUrl.origin);
      redirectUrl.searchParams.set('code', code);
      return NextResponse.redirect(redirectUrl);
    }

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
