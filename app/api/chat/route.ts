import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAIResponse, AIProvider } from '@/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    const { messages, context = {}, provider = 'auto', mode = 'student', chatId } = reqBody;

    let systemPrompt = '';
    let liveSiteStats: any = null;

    // Check Supabase authentication
    const authHeader = req.headers.get('authorization');
    let user: any = null;
    let supabaseAuth: any = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data: userData } = await supabaseAuth.auth.getUser();
      user = userData?.user || null;
    }

    if (mode === 'admin') {
      // Gather live website insights for Admin Co-Pilot
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );

        const [studentsRes, coursesRes, pendingSessionsRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabaseAdmin.from('courses').select('id, title, published'),
          supabaseAdmin.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        liveSiteStats = {
          totalStudents: studentsRes.count || 0,
          totalCourses: coursesRes.data?.length || 0,
          publishedCourses: coursesRes.data?.filter(c => c.published).length || 0,
          draftCourses: coursesRes.data?.filter(c => !c.published).length || 0,
          courseList: coursesRes.data?.slice(0, 10).map(c => c.title) || [],
          pendingLiveSessions: pendingSessionsRes.count || 0,
        };
      } catch (err) {
        console.error("Failed fetching admin stats for AI context:", err);
      }

      systemPrompt = `
You are the official Admin AI Co-Pilot for "Michael Gad Math Academy". You are talking to the website administrator/owner (Michael Gad).

YOUR ROLE & RESPONSIBILITIES:
1. Executive Website Assistant: Help Michael manage courses, student progress, live session scheduling, platform settings, marketing, and curriculum design.
2. Direct Site Intelligence: You have real-time site data available right now:
   - Total Enrolled Students: ${liveSiteStats?.totalStudents ?? 'N/A'}
   - Total Courses: ${liveSiteStats?.totalCourses ?? 'N/A'} (${liveSiteStats?.publishedCourses ?? 0} Published, ${liveSiteStats?.draftCourses ?? 0} Drafts)
   - Recent Course Titles: ${liveSiteStats?.courseList?.join(', ') || 'None listed yet'}
   - Pending Live Session Requests: ${liveSiteStats?.pendingLiveSessions ?? 0}
   - Admin Current Page: ${context.currentPage || '/admin/stats'}

3. Actionable Site Navigation & Quick Links:
   Whenever recommending an action or navigation step, embed actionable Markdown links using the website paths:
   - Dashboard Overview & Analytics: [View Stats Summary](/admin/stats)
   - Course Builder / Curriculum: [Open Course Builder](/admin/courses)
   - Student Directory: [Manage Students](/admin/students)
   - Live Session Booking Requests: [Manage Live Sessions](/admin/live-sessions)
   - Submissions & Student Work: [Review Submissions](/admin/submissions)
   - Platform Wallet & Billing: [Open Wallet Overview](/admin/wallet)
   - AI Interaction Logs: [View Student Chat Logs](/admin/chat-logs)
   - Site Settings: [Open Admin Settings](/admin/settings)

4. Tone & Style: Highly professional, proactive, concise, encouraging, and structured. Use Markdown bullet points, bold key metrics, and clean headers.
      `;
    } else {
      // Student Mode System Prompt
      systemPrompt = `
You are a highly intelligent, expert Math Tutor and the official AI Assistant for "Michael Gad Math Academy".
Your primary goal is to help the student learn deeply, not just give them the answers.

STUDENT CONTEXT:
- Student Name: ${context.studentName || 'Student'}
- Current Page: ${context.currentPage || 'dashboard'}

CORE BEHAVIOR & PEDAGOGY:
1. Socratic Method: If a student asks a math problem, do NOT just give the final answer immediately. Guide them step-by-step. Ask leading questions.
2. Encouragement: Always be highly motivating, patient, and warm.
3. Clarity: Explain complex mathematical concepts using simple, intuitive analogies.
4. Persona: You represent Michael Gad. You are an elite, premium, and friendly tutor.
5. Platform Assistance: You can answer questions about navigating the site or math lessons.
6. Formatting: Use clear spacing, short paragraphs, bullet points, and plain text math notation (e.g., x^2, sqrt(x), a/b).

Never break character. Do not introduce yourself as an underlying model. You are Michael Gad's Math AI Assistant.
      `;
    }

    // Check student AI permissions & limits if user is a student
    let studentProfile: any = null;
    if (supabaseAuth && user && mode !== 'admin') {
      try {
        const { data: profile } = await supabaseAuth
          .from('profiles')
          .select('ai_enabled, ai_disabled_reason, ai_daily_limit, full_name')
          .eq('id', user.id)
          .maybeSingle();

        studentProfile = profile;

        // 1. Check if instructor has disabled AI for this student
        if (profile && profile.ai_enabled === false) {
          return NextResponse.json(
            { 
              error: profile.ai_disabled_reason || 'AI Assistant access has been disabled for your account by the instructor. Please contact Michael Gad for assistance.',
              ai_disabled: true 
            }, 
            { status: 403 }
          );
        }

        // 2. Check if student has a daily question limit configured
        if (profile?.ai_daily_limit && profile.ai_daily_limit > 0) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);

          const { count: todayCount } = await supabaseAuth
            .from('ai_usage_events')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .gte('created_at', startOfDay.toISOString());

          if (todayCount !== null && todayCount >= profile.ai_daily_limit) {
            return NextResponse.json(
              { 
                error: `You have reached your daily limit of ${profile.ai_daily_limit} AI questions. Please continue with your lessons and try again tomorrow.`,
                limit_reached: true 
              }, 
              { status: 429 }
            );
          }
        }
      } catch (err) {
        console.warn("Could not check student profile for AI permissions (proceeding):", err);
      }
    }

    // Call unified AI provider (Claude / GPT load balancer)
    const aiResult = await generateAIResponse({
      messages,
      systemPrompt,
      preferredProvider: provider as AIProvider,
    });

    let currentChatId = chatId || null;

    // Persist chat logs & token tracking if user session is present
    if (supabaseAuth && user) {
      const fullMessages = [...messages, { 
        role: 'assistant', 
        content: aiResult.reply,
        provider: aiResult.provider,
        model: aiResult.model,
        usage: aiResult.usage
      }];

      const promptTokens = aiResult.usage?.promptTokens || 0;
      const completionTokens = aiResult.usage?.completionTokens || 0;
      const totalTokens = aiResult.usage?.totalTokens || 0;
      
      if (chatId) {
        // Try update with token metrics, fallback to standard update if columns not yet migrated
        const updatePayload: any = {
          messages: fullMessages,
          context: { ...context, mode, provider: aiResult.provider, model: aiResult.model }
        };

        const { error: updErr } = await supabaseAuth.from('chat_logs').update({
          ...updatePayload,
          total_messages: fullMessages.length,
          total_tokens: totalTokens,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          last_active_at: new Date().toISOString()
        }).eq('id', chatId);

        if (updErr) {
          // Fallback if extra columns don't exist yet
          await supabaseAuth.from('chat_logs').update(updatePayload).eq('id', chatId);
        }
        currentChatId = chatId;
      } else {
        const insertPayload: any = {
          student_id: user.id,
          messages: fullMessages,
          context: { ...context, mode, provider: aiResult.provider, model: aiResult.model }
        };

        let { data: newChat, error } = await supabaseAuth.from('chat_logs').insert({
          ...insertPayload,
          total_messages: fullMessages.length,
          total_tokens: totalTokens,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          last_active_at: new Date().toISOString()
        }).select().single();

        if (error) {
          // Fallback if extra columns don't exist yet
          const fallbackRes = await supabaseAuth.from('chat_logs').insert(insertPayload).select().single();
          newChat = fallbackRes.data;
        }
        
        if (newChat) {
          currentChatId = newChat.id;
        }
      }

      // Record detailed event log for AI usage analytics & token tracking
      try {
        await supabaseAuth.from('ai_usage_events').insert({
          student_id: user.id,
          chat_id: currentChatId,
          provider: aiResult.provider,
          model: aiResult.model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cost_cents: aiResult.usage?.estimatedCostCents || 0,
          context_page: context.currentPage || null
        });
      } catch (eventErr) {
        console.warn('ai_usage_events log skipped (table might need migration):', eventErr);
      }
    }

    return NextResponse.json({
      reply: aiResult.reply,
      provider: aiResult.provider,
      model: aiResult.model,
      chatId: currentChatId,
      usage: aiResult.usage
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
