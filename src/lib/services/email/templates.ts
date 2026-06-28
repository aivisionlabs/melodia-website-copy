/**
 * Email Templates
 * Shared email templates for all email providers
 * Using Melodia brand colors and design system
 */

function getBaseEmailStyles() {
  return `
    body { font-family: 'Montserrat', sans-serif; line-height: 1.6; color: #073B4C; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FFD166 0%, #FFC107 100%); color: #073B4C; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #FDFDFD; padding: 30px; border: 1px solid #FFD166; border-top: none; border-radius: 0 0 12px 12px; }
    h1 { font-family: 'Poppins', sans-serif; font-size: 32px; font-weight: 700; color: #073B4C; margin: 0 0 20px 0; }
    h2 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 600; color: #073B4C; margin: 20px 0 10px 0; }
    p { font-size: 16px; color: #073B4C; margin: 10px 0; }
    .code-box { background: #FDFDFD; border: 2px solid #FFD166; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-family: 'Poppins', monospace; font-size: 32px; font-weight: 700; color: #EF476F; letter-spacing: 4px; }
    .button { display: inline-block; background: linear-gradient(135deg, #FFD166 0%, #FFC107 100%); color: #073B4C; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-family: 'Poppins', sans-serif; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #FFD166; color: #888; font-size: 14px; }
    .info-box { background: #e8f4fd; border-left: 4px solid #EF476F; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .highlight { color: #EF476F; font-weight: 700; }
  `;
}

function getBaseEmailWrapper(title: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Montserrat:wght@400;500&display=swap" rel="stylesheet">
        <style>${getBaseEmailStyles()}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Melodia. Create personalized songs for your loved ones.
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getVerificationEmailTemplate(name: string, code: string) {
  const content = `
    <p>Hi ${name},</p>
    <p>Welcome to <strong>Melodia</strong>! We're excited to have you join our community of music lovers.</p>
    <div class="code-box">
      <p style="margin: 0; color: #888; font-size: 14px; margin-bottom: 10px;">Your verification code</p>
      <div class="code">${code}</div>
      <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">This code will expire in 15 minutes</p>
    </div>
    <p>Enter this code to verify your account and start creating personalized songs for your loved ones.</p>
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">🔒 If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return getBaseEmailWrapper('🎵 Welcome to Melodia!', content);
}

export function getPasswordResetEmailTemplate(name: string, code: string) {
  const content = `
    <p>Hi ${name},</p>
    <p>We received a request to reset your password for your Melodia account.</p>
    <div class="code-box">
      <p style="margin: 0; color: #888; font-size: 14px; margin-bottom: 10px;">Your reset code</p>
      <div class="code">${code}</div>
      <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">This code will expire in 15 minutes</p>
    </div>
    <p>Use this code to reset your password and regain access to your account.</p>
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">🔒 If you didn't request this, please ignore this email. Your password won't be changed.</p>
    </div>
  `;
  return getBaseEmailWrapper('🔒 Reset Your Password', content);
}

export function getSongRequestConfirmationTemplate(
  requesterName: string,
  recipientName: string,
  requestId: number
) {
  const content = `
    <p>Hi ${requesterName || 'there'},</p>
    <p>Thank you for choosing Melodia! We're thrilled to help you create something special for ${recipientName}.</p>
    <div class="info-box">
      <p style="margin: 0;"><strong>Request ID:</strong> ${requestId}</p>
    </div>
    <h2>What happens next?</h2>
    <p>✓ We've received your song request<br>
    ✓ You'll receive an update when your song is ready to listen</p>
    <p>We're excited to create something magical, we will put our heart and soul into making your song truly special.</p>
    <p style="margin-top: 30px;">With love,<br><strong>The Melodia Team</strong></p>
  `;
  return getBaseEmailWrapper('🎵 Song Request Received!', content);
}

export function getSongReadyTemplate(
  requesterName: string,
  songTitle: string,
  songUrl: string
) {
  const content = `
    <p>Hi ${requesterName},</p>
    <p>🎉 Great news! Your personalized song "<span class="highlight">${songTitle}</span>" is ready!</p>
    <p>We've poured our hearts into creating something truly special. It's time to listen, share, and celebrate!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${songUrl}" class="button">🎵 Listen Now</a>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">Or copy this link: <br>${songUrl}</p>
    <h2>Share the joy</h2>
    <p>Spread the love! Share your song with friends and family to let them experience the magic.</p>
    <p style="margin-top: 30px;">Thank you for choosing Melodia! 🎶</p>
    <p>With love,<br><strong>The Melodia Team</strong></p>
  `;
  return getBaseEmailWrapper('🎵 Your Song is Ready!', content);
}

export function getPaymentConfirmationTemplate(
  name: string,
  amount: number,
  currency: string,
  paymentId: string
) {
  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for your payment! We've successfully received your payment of <span class="highlight">${currency} ${amount}</span>.</p>
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> ${currency} ${amount}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Payment Confirmed ✓</p>
    </div>
    <h2>What happens next?</h2>
    <p>✓ Your song is being created with love and care<br>
    ✓ We'll notify you as soon as it's ready<br>
    ✓ You'll receive an email with your personalized song</p>
    <p>We're excited to create something magical for you!</p>
    <p style="margin-top: 30px;">Thank you for choosing Melodia! 🎵</p>
    <p>With love,<br><strong>The Melodia Team</strong></p>
  `;
  return getBaseEmailWrapper('💳 Payment Confirmed', content);
}

export function getSongRequestNotificationTemplate({
  requesterName,
  recipientDetails,
  occasion,
  languages,
  story,
  mood,
  mobileNumber,
  email,
  requestId,
  selectedPackage,
}: {
  requesterName?: string;
  recipientDetails: string;
  occasion?: string;
  languages: string;
  story?: string;
  mood?: string[];
  mobileNumber?: string;
  email?: string;
  requestId: string;
  selectedPackage?: string;
}) {
  return `
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
          .story-box { background: #f9f9f9; border-left: 4px solid #EF476F; padding: 15px; margin-top: 10px; }
          .mood-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
          .mood-tag { background: #EF476F; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .request-id { background: #e8f4fd; border: 1px solid #2196F3; padding: 10px; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎵 New Song Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Request ID: ${requestId}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Requester:</div>
              <div class="value">${requesterName || 'Customer'}</div>
            </div>
            <div class="field">
              <div class="label">🎯 For:</div>
              <div class="value">${recipientDetails}</div>
            </div>
            ${occasion ? `
            <div class="field">
              <div class="label">🎉 Occasion:</div>
              <div class="value">${occasion}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">🌍 Language(s):</div>
              <div class="value">${languages}</div>
            </div>
            ${mood && mood.length > 0 ? `
            <div class="field">
              <div class="label">🎭 Mood:</div>
              <div class="mood-tags">
                ${mood.map(m => `<span class="mood-tag">${m}</span>`).join('')}
              </div>
            </div>
            ` : ''}
            ${story ? `
            <div class="field">
              <div class="label">📖 Story & Details:</div>
              <div class="story-box">${story.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}
            ${mobileNumber || email ? `
            <div class="field">
              <div class="label">📞 Contact Details:</div>
              <div class="value">
                ${mobileNumber ? `📱 Mobile: ${mobileNumber}<br>` : ''}
                ${email ? `📧 Email: ${email}` : ''}
              </div>
            </div>
            ` : ''}
            ${selectedPackage ? `
            <div class="field">
              <div class="label">🎁 Selected Package:</div>
              <div class="value">${selectedPackage}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">📅 Received:</div>
              <div class="value">${new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long'
  })}</div>
            </div>
            <div class="request-id">
              <strong>Request ID:</strong> ${requestId}
            </div>
          </div>
          <div class="footer">
            This song request was submitted through the Melodia website
          </div>
        </div>
      </body>
    </html>
  `;
}

