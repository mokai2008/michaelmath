import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  // Sanitize the key to remove hidden unicode characters like U+2028 (Line Separator) 
  // that cause 'Cannot convert argument to a ByteString' errors when copy-pasting.
  apiKey: (process.env.OPENAI_API_KEY || '').replace(/[\u2028\u2029\r\n\s]/g, '').trim(),
});

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    const { messages, context, chatId } = reqBody;

    const systemPrompt = `
      You are a highly intelligent, expert Math Tutor and the official AI Assistant for "Michael Gad Math Academy".
      Your primary goal is to help the student learn deeply, not just give them the answers.
      
      STUDENT CONTEXT:
      - Student name: ${context.studentName || 'Student'}
      - Current Page URL: ${context.currentPage || 'dashboard'}
      
      CORE BEHAVIOR & PEDAGOGY:
      1. Socratic Method: If a student asks a math problem, do NOT just give the final answer immediately. Guide them step-by-step. Ask leading questions.
      2. Encouragement: Always be highly motivating, patient, and warm.
      3. Clarity: Explain complex mathematical concepts using simple, intuitive analogies.
      4. Persona: You represent Michael Gad. You are an elite, premium, and friendly tutor.
      5. Platform Help: If they ask about their current page (URL: ${context.currentPage}), use the URL to infer where they are (e.g. /dashboard/courses means they are in a course). Note: You do NOT have access to the exact text or titles on their screen. If they ask "what is this lesson title", politely explain that while you know they are in the Course Viewer, you cannot see their screen pixels, but you are ready to help them with any math topic they tell you about!
      6. Formatting: Use clear spacing, short paragraphs, bullet points, and plain text math notation (e.g., x^2, sqrt(x), a/b).

      Never break character. Do not introduce yourself as an OpenAI model. You are the Michael Gad Math AI Assistant.
    `;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        reply: "This is a mock response. Please add OPENAI_API_KEY to your .env.local file to use the real ChatGPT." 
      });
    }

    // Format messages for OpenAI
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => {
        if (m.role === 'user' && m.image) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content || "Please look at this image and help me." },
              { type: "image_url", image_url: { url: m.image } }
            ]
          };
        }
        return { role: m.role, content: m.content };
      })
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const replyText = response.choices[0].message.content || 'Sorry, I could not generate a response.';
    
    let currentChatId = context.chatId || messages[0]?.chatId || null; // Wait, we passed chatId in the root of the JSON body

    // 1. Check for Auth
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        const fullMessages = [...messages, { role: 'assistant', content: replyText }];
        
        if (reqBody.chatId) {
          // Update existing
          await supabaseAuth.from('chat_logs').update({
            messages: fullMessages,
            context: context
          }).eq('id', reqBody.chatId);
          currentChatId = reqBody.chatId;
        } else {
          // Insert new
          const { data: newChat, error } = await supabaseAuth.from('chat_logs').insert({
            student_id: user.id,
            messages: fullMessages,
            context: context
          }).select().single();
          
          if (!error && newChat) {
            currentChatId = newChat.id;
          }
        }
      }
    }

    return NextResponse.json({ reply: replyText, chatId: currentChatId });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
