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

    // Call unified AI provider (Claude / GPT load balancer)
    const aiResult = await generateAIResponse({
      messages,
      systemPrompt,
      preferredProvider: provider as AIProvider,
    });

    let currentChatId = chatId || null;

    // Persist chat logs if user session is present
    if (supabaseAuth && user) {
      const fullMessages = [...messages, { 
        role: 'assistant', 
        content: aiResult.reply,
        provider: aiResult.provider,
        model: aiResult.model
      }];
      
      if (chatId) {
        await supabaseAuth.from('chat_logs').update({
          messages: fullMessages,
          context: { ...context, mode, provider: aiResult.provider, model: aiResult.model }
        }).eq('id', chatId);
        currentChatId = chatId;
      } else {
        const { data: newChat, error } = await supabaseAuth.from('chat_logs').insert({
          student_id: user.id,
          messages: fullMessages,
          context: { ...context, mode, provider: aiResult.provider, model: aiResult.model }
        }).select().single();
        
        if (!error && newChat) {
          currentChatId = newChat.id;
        }
      }
    }

    return NextResponse.json({
      reply: aiResult.reply,
      provider: aiResult.provider,
      model: aiResult.model,
      chatId: currentChatId,
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
