# Contact Form Email Setup Guide

The contact form is now configured to send emails using **Resend** - a modern, developer-friendly email API.

## ✅ What's Already Done

- ✅ Resend package installed (`npm install resend`)
- ✅ React Email Render package installed (`npm install @react-email/render`)
- ✅ Contact form with validation
- ✅ Beautiful HTML email template with Melodia branding
- ✅ Error handling and fallback messages
- ✅ Console logging for debugging

## 🚀 Quick Setup (5 minutes)

### Step 1: Sign up for Resend

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Get Your API Key

1. Go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Melodia Contact Form")
4. Copy the API key (starts with `re_`)

### Step 3: Add Domain (Optional but Recommended)

**For Testing (Use Resend's Test Domain):**
- You can use `onboarding@resend.dev` for testing
- Skip to Step 4

**For Production (Use Your Own Domain):**
1. Go to [Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain: `melodia-songs.com`
4. Follow DNS verification steps
5. Once verified, you can use: `noreply@melodia-songs.com`

### Step 4: Configure Environment Variables

Create or update `.env.local` file in your project root:

```env
# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Melodia <onboarding@resend.dev>
```

**For production with verified domain:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Melodia <noreply@melodia-songs.com>
```

### Step 5: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## 📧 How It Works

1. User fills out contact form on `/contact`
2. Form validates all fields
3. API route sends email via Resend
4. Email arrives at `info@melodia-songs.com`
5. You can reply directly to the user's email

## 📨 Email Template Features

- ✅ Beautiful HTML design with Melodia brand colors
- ✅ All form data formatted nicely
- ✅ User's email set as Reply-To (click reply to respond)
- ✅ Timestamp with full date and time
- ✅ Mobile-responsive design

## 🧪 Testing

1. Go to `http://localhost:3000/contact`
2. Fill out the form
3. Click "Send Message"
4. Check your email at `info@melodia-songs.com`
5. Check console logs for confirmation

## 🔍 Troubleshooting

### Email not sending?
- Check console logs for error messages
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for delivery status
- Make sure domain is verified (if using custom domain)

### Console shows "API key not configured"?
- Make sure `.env.local` file exists
- Verify the variable name is `RESEND_API_KEY`
- Restart the dev server after adding env variables

### Email goes to spam?
- Use a verified domain instead of `onboarding@resend.dev`
- Add SPF and DKIM records (Resend provides these)
- Ask recipients to whitelist your domain

## 📊 Resend Dashboard

Monitor your emails at: [resend.com/emails](https://resend.com/emails)

You can see:
- Delivery status
- Open rates
- Click rates
- Bounce rates
- Error logs

## 💰 Pricing

**Free Tier:**
- 100 emails/day
- 3,000 emails/month
- Perfect for getting started

**Paid Plans:**
- Start at $20/month for 50,000 emails
- No credit card required for free tier

## 🎯 Production Deployment

When deploying to production (Vercel, etc.):

1. Add environment variables in your hosting platform
2. Use your verified domain for `RESEND_FROM_EMAIL`
3. Test thoroughly before going live
4. Monitor the Resend dashboard for issues

## 🔐 Security Notes

- ✅ API key is server-side only (not exposed to client)
- ✅ Form validation prevents spam
- ✅ Rate limiting recommended for production
- ✅ Email addresses validated before sending

## 📞 Need Help?

- Resend Docs: [resend.com/docs](https://resend.com/docs)
- Resend Support: [resend.com/support](https://resend.com/support)
- Next.js + Resend Guide: [resend.com/docs/send-with-nextjs](https://resend.com/docs/send-with-nextjs)

---

**Ready to test?** Just add your `RESEND_API_KEY` to `.env.local` and restart your server! 🚀

