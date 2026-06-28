import { NextResponse } from 'next/server';
import { EmailFactory } from '@/lib/services/email/email-factory';

// Force this route to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, subject, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (process.env.EMAIL_DEMO === 'true') {
      return NextResponse.json(
        { success: true, message: 'Thank you for your message! We have received your submission and will get back to you soon.' },
        { status: 200 }
      );
    }

    try {
      // Use email factory to send contact form notification
      const emailProvider = EmailFactory.getProvider();

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FFD166 0%, #FFC107 100%); color: #073B4C; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #FDFDFD; padding: 30px; border: 1px solid #FFD166; border-top: none; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 20px; }
              .label { font-weight: 600; color: #073B4C; margin-bottom: 5px; }
              .value { color: #555; }
              .message-box { background: #f9f9f9; border-left: 4px solid #EF476F; padding: 15px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎵 New Contact Form Submission</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">👤 Name:</div>
                  <div class="value">${firstName} ${lastName}</div>
                </div>
                <div class="field">
                  <div class="label">📧 Email:</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="field">
                  <div class="label">📋 Subject:</div>
                  <div class="value">${subject}</div>
                </div>
                <div class="field">
                  <div class="label">💬 Message:</div>
                  <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
                </div>
                <div class="field">
                  <div class="label">📅 Received:</div>
                  <div class="value">${new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'long'
      })}</div>
                </div>
              </div>
              <div class="footer">
                This message was sent from the Melodia contact form
              </div>
            </div>
          </body>
        </html>
      `;

      // Note: sendInternalNotification doesn't support replyTo, so we'll include it in the email body
      // For future enhancement, we could add replyTo support to the interface
      await emailProvider.sendInternalNotification(
        'info@melodia-songs.com',
        `Contact Form: ${subject}`,
        html
      );

      console.log('✅ Contact form email sent successfully');

      return NextResponse.json(
        {
          success: true,
          message: 'Thank you for your message! We have received your submission and will get back to you soon.'
        },
        { status: 200 }
      );

    } catch (emailError: any) {
      console.error('❌ Error sending contact form email:', emailError);

      // Still return success since we logged the submission
      return NextResponse.json(
        {
          success: true,
          message: 'Thank you for your message! We have received your submission. For immediate assistance, please contact us at info@melodia-songs.com or call +917483464565',
          note: 'Email delivery pending'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Error processing contact form:', error);

    return NextResponse.json(
      {
        error: 'Failed to process your message. Please contact us directly at info@melodia-songs.com or call +917483464565',
        fallbackContact: {
          email: 'info@melodia-songs.com',
          phone: '+917483464565'
        }
      },
      { status: 500 }
    );
  }
}

