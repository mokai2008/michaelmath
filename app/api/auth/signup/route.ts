import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAnon = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, studentWhatsapp, parentEmail, parentWhatsapp } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Try creating user via Admin API with email_confirm: true (bypasses confirmation emails completely)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        student_whatsapp: studentWhatsapp,
        parent_email: parentEmail,
        parent_whatsapp: parentWhatsapp
      }
    });

    if (createError) {
      // If error is duplicate email or something else, return clear message
      if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
      }
      
      // Fallback: try standard signup if admin API is disabled/unsupported
      const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            student_whatsapp: studentWhatsapp,
            parent_email: parentEmail,
            parent_whatsapp: parentWhatsapp
          }
        }
      });

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      if (signUpData.session) {
        return NextResponse.json({ session: signUpData.session, user: signUpData.user });
      }
    }

    // Sign in to get session tokens for client
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 });
    }

    return NextResponse.json({
      session: sessionData.session,
      user: sessionData.user
    });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json({ error: err.message || 'An error occurred during signup.' }, { status: 500 });
  }
}
