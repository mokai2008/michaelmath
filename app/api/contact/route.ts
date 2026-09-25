import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, message } = body;

    if (!email || !message || !firstName) {
      return NextResponse.json(
        { error: 'First name, email address, and message are required.' },
        { status: 400 }
      );
    }

    const recipientEmail = 'mokai2008@gmail.com';
    const senderName = `${firstName} ${lastName || ''}`.trim();
    let emailSent = false;
    let deliveryMethod = 'none';

    // 1. Save submission to Supabase contact_messages table so no message is lost
    try {
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert([
          {
            first_name: firstName,
            last_name: lastName || '',
            email: email,
            message: message,
            status: 'unread',
          },
        ]);

      if (dbError) {
        console.warn('[Contact API] DB warning:', dbError.message);
      }
    } catch (dbErr: any) {
      console.warn('[Contact API] DB insert error:', dbErr?.message || dbErr);
    }

    // 2. Try Resend API if RESEND_API_KEY is present in process.env
    if (!emailSent && process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Michael Gad Math <onboarding@resend.dev>',
            to: [recipientEmail],
            reply_to: email,
            subject: `[Contact Form] Message from ${senderName}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; color: #333;">
                <h2 style="color: #059669;">New Contact Form Message</h2>
                <p><strong>From:</strong> ${senderName} (&lt;${email}&gt;)</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #059669;">
                  <p style="white-space: pre-wrap; margin: 0;">${message}</p>
                </div>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
          deliveryMethod = 'Resend API';
        } else {
          const errText = await resendRes.text();
          console.error('[Contact API] Resend API error:', errText);
        }
      } catch (resendErr: any) {
        console.error('[Contact API] Resend fetch error:', resendErr);
      }
    }

    // 3. Try Custom Webhook if CONTACT_WEBHOOK_URL is set
    if (!emailSent && process.env.CONTACT_WEBHOOK_URL) {
      try {
        const webhookRes = await fetch(process.env.CONTACT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            customer_email: email,
            recipient: recipientEmail,
            subject: `Contact Form Message from ${senderName}`,
            message,
          }),
        });

        if (webhookRes.ok) {
          emailSent = true;
          deliveryMethod = 'Custom Webhook';
        } else {
          console.error('[Contact API] Webhook status:', webhookRes.status);
        }
      } catch (webhookErr: any) {
        console.error('[Contact API] Webhook error:', webhookErr);
      }
    }

    // 4. Try Web3Forms if WEB3FORMS_ACCESS_KEY is set
    if (!emailSent && process.env.WEB3FORMS_ACCESS_KEY) {
      try {
        const web3Res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_key: process.env.WEB3FORMS_ACCESS_KEY,
            name: senderName,
            email: email,
            subject: `Contact Form Message from ${senderName}`,
            message: message,
            to: recipientEmail,
          }),
        });

        if (web3Res.ok) {
          emailSent = true;
          deliveryMethod = 'Web3Forms';
        }
      } catch (web3Err: any) {
        console.error('[Contact API] Web3Forms error:', web3Err);
      }
    }

    if (!emailSent) {
      console.log(
        `[Contact API] Message saved to DB. To deliver emails directly to ${recipientEmail}, set RESEND_API_KEY, WEB3FORMS_ACCESS_KEY, or CONTACT_WEBHOOK_URL in .env.local`
      );
    }

    return NextResponse.json({
      success: true,
      emailSent,
      deliveryMethod,
      message: 'Your message has been sent successfully!',
    });
  } catch (error: any) {
    console.error('[Contact API] Internal Server Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit contact message.' },
      { status: 500 }
    );
  }
}
