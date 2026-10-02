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

    let userId: string | null = null;

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

      if (signUpData.session && signUpData.user) {
        userId = signUpData.user.id;
        // Explicitly update profiles with WhatsApp numbers (trigger may not get metadata)
        await supabaseAnon.from('profiles').update({
          student_whatsapp: studentWhatsapp || null,
          parent_email: parentEmail || null,
          parent_whatsapp: parentWhatsapp || null,
          full_name: fullName || null
        }).eq('id', userId);
        return NextResponse.json({ session: signUpData.session, user: signUpData.user });
      }
    } else if (userData?.user) {
      userId = userData.user.id;
    }

    // Sign in to get session tokens for client
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 });
    }

    // Explicitly update profiles with WhatsApp numbers after sign-in
    // This ensures data is saved even if the trigger didn't receive user_metadata
    const finalUserId = userId || sessionData.user?.id;
    if (finalUserId) {
      await supabaseAdmin.from('profiles').update({
        student_whatsapp: studentWhatsapp || null,
        parent_email: parentEmail || null,
        parent_whatsapp: parentWhatsapp || null,
        full_name: fullName || null
      }).eq('id', finalUserId);

      // Automatically enroll student into the 1st course upon signup
      try {
        const { data: firstCourse } = await supabaseAdmin
          .from('courses')
          .select('id')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCourse) {
          await supabaseAdmin
            .from('enrollments')
            .upsert(
              { student_id: finalUserId, course_id: firstCourse.id },
              { onConflict: 'student_id,course_id' }
            );
        }
      } catch (autoEnrErr) {
        console.warn('Auto-enroll error on signup:', autoEnrErr);
      }
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
