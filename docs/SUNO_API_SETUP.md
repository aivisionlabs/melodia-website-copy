# Suno API Setup Guide

This guide shows you how to switch from the mock API to the real Suno API.

## Step 1: Get Your Suno API Token

1. Go to [Suno API Dashboard](https://sunoapi.org/)
2. Sign up/Login to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the token (it starts with `sk-`)

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Suno API Configuration
SUNO_API_TOKEN=sk-your_actual_suno_token_here

# Base URL for webhooks (required for Suno callbacks)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# For production: NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Step 3: Switch from Mock to Real API

Edit `src/lib/suno-api.ts` and change the last line:

```typescript
// Change this line at the bottom of the file:
export default mockSunoAPI;

// To this:
export default new SunoAPI(process.env.SUNO_API_TOKEN!);
```

## Step 4: Update Webhook URL (Production Only)

If you're deploying to production, update the webhook URL in `src/lib/actions.ts`:

```typescript
callBackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/suno-webhook`
```

Make sure your domain is accessible to Suno's servers.

## Step 5: Test the Integration

1. Start your development server
2. Go to `/song-admin-portal/create`
3. Fill out the form and submit
4. You should now see real API calls to Suno

## Verification Steps

### Check API Calls
Look for these in your browser's Network tab:
- `POST https://api.sunoapi.org/api/v1/generate`
- `GET https://api.sunoapi.org/api/v1/generate/record-info?taskId=...`

### Check Console Logs
You should see real task IDs instead of mock ones:
- Mock: `mock_task_1_1234567890`
- Real: `5c79****be8e`

### Check Webhook
Monitor your server logs for webhook calls:
```
Suno Webhook received: { ... real data ... }
```

## Troubleshooting

### Common Issues

1. **"Suno API error: 401"**
   - Check your API token is correct
   - Verify the token starts with `sk-`

2. **"Suno API error: 403"**
   - Your API key might be invalid or expired
   - Check your Suno account status

3. **"Suno API error: 429"**
   - Rate limit exceeded
   - Wait a few minutes before trying again

4. **Webhook not receiving calls**
   - Check your `NEXT_PUBLIC_BASE_URL` is correct
   - Ensure your domain is publicly accessible
   - Check firewall settings

### Debug Mode

Enable detailed logging by adding this to your `.env.local`:

```bash
NODE_ENV=development
DEBUG=suno-api:*
```

## Switching Back to Mock

If you need to switch back to mock for testing:

```typescript
// In src/lib/suno-api.ts
export default mockSunoAPI; // Mock API
// export default new SunoAPI(process.env.SUNO_API_TOKEN!); // Real API
```

## Production Checklist

Before going live:

- [ ] API token is valid and has sufficient credits
- [ ] `NEXT_PUBLIC_BASE_URL` points to your production domain
- [ ] Webhook endpoint is publicly accessible
- [ ] Error handling is tested with real API responses
- [ ] Rate limiting is considered for high traffic
- [ ] Monitoring is set up for API failures