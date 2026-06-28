# Christmas Dynamic Page Setup Guide

## Overview

The Christmas page (`/christmas`) is a dynamic, personalized page that displays Christmas wishes for individual users with their custom audio messages. The page accepts query parameters to personalize the experience.

## Features

- ✅ Dynamic user name display
- ✅ Personalized Christmas greetings
- ✅ Audio player for custom Christmas messages
- ✅ Beautiful Christmas-themed UI with animated snowflakes
- ✅ Error handling for missing or invalid audio files
- ✅ Responsive design for all devices

## Cloudflare R2 Setup (Free Tier)

### Pricing Information

**Cloudflare R2 Free Tier:**
- **Storage**: 10GB free
- **Class A Operations** (writes, lists): 1 million/month free
- **Class B Operations** (reads): 10 million/month free
- **Egress**: Free (no egress fees!)

**For ~50 audio files:**
- Storage: ~50-100MB (assuming 1-2MB per audio file) - **FREE**
- Operations: 50 reads - **FREE**
- **Total Cost: $0/month** ✅

### Setup Steps

1. **Create Cloudflare Account** (if you don't have one)
   - Go to [cloudflare.com](https://www.cloudflare.com)
   - Sign up for free account

2. **Create R2 Bucket**
   - Go to Cloudflare Dashboard → R2
   - Click "Create bucket"
   - Name it (e.g., `christmas-audio`)
   - Choose a location close to your users

3. **Make Bucket Public**
   - Go to your bucket settings
   - Enable "Public Access"
   - Note the public URL format: `https://pub-{account-id}.r2.dev`

4. **Upload Audio Files**
   - Upload your Christmas audio messages to the bucket
   - Organize them by user name or ID (e.g., `john-christmas.mp3`, `sarah-christmas.mp3`)

5. **Configure Environment Variable**
   - Add to your `.env.local`:
   ```env
   NEXT_PUBLIC_CLOUDFLARE_MEDIA_HOST=https://pub-{your-account-id}.r2.dev
   ```
   - Replace `{your-account-id}` with your actual Cloudflare account ID
   - **Important**: Include the full URL with `https://` but without trailing slash

## Usage

### Basic Usage

Access the page with query parameters. The `audio` parameter should be just the path to the file (not the full URL):

```
/christmas?name=John&audio=john-christmas.mp3
```

The full URL will be automatically constructed by combining the `NEXT_PUBLIC_CLOUDFLARE_MEDIA_HOST` environment variable with the audio path.

### Query Parameters

- `name` (optional): User's name to display. Defaults to "Kid" if not provided.
- `audio` (optional): Path to the audio file (relative to the media host). If not provided, shows a message indicating no audio is available.

**Note**: The `audio` parameter should be just the file path (e.g., `john-christmas.mp3` or `audio/john-christmas.mp3`), not the full URL. The full URL is constructed automatically from the environment variable.

## Example URLs

```
/christmas?name=Sarah&audio=sarah-christmas.mp3
/christmas?name=Michael&audio=michael-christmas.mp3
/christmas?name=Emma&audio=audio/emma-christmas.mp3
/christmas?name=John&audio=christmas-messages/john.mp3
```

## Audio File Requirements

- **Format**: MP3 recommended (widely supported)
- **Size**: Keep under 5MB for faster loading
- **Duration**: Recommended 30 seconds to 2 minutes
- **CORS**: Cloudflare R2 public buckets support CORS by default

## Features

### Audio Player
- Play/Pause controls
- Progress slider
- Skip forward/backward (10 seconds)
- Time display
- Loading states
- Error handling

### UI Elements
- Animated snowflakes background
- Personalized greeting with user's name
- Christmas-themed color scheme (red and green)
- Responsive design
- Error messages for invalid audio URLs

## Testing

1. **Test with valid audio path:**
   ```
   /christmas?name=TestUser&audio=test-audio.mp3
   ```
   Ensure `test-audio.mp3` exists in your R2 bucket.

2. **Test with invalid audio path:**
   ```
   /christmas?name=TestUser&audio=non-existent-file.mp3
   ```
   Should show error message when audio fails to load.

3. **Test without audio:**
   ```
   /christmas?name=TestUser
   ```
   Should show message indicating no audio available.

## Troubleshooting

### Audio Not Playing

1. **Check CORS**: Ensure your R2 bucket has public access enabled
2. **Check Path**: Verify the audio path matches the file name in your R2 bucket
3. **Check Environment Variable**: Ensure `NEXT_PUBLIC_CLOUDFLARE_MEDIA_HOST` is set correctly
4. **Check Format**: Ensure audio file is in a supported format (MP3 recommended)
5. **Check Browser Console**: Look for CORS or network errors
6. **Verify Full URL**: Check browser network tab to see the constructed URL

### Environment Variable Not Working

1. **Restart Dev Server**: After adding env vars, restart Next.js dev server
2. **Check Variable Name**: Must be `NEXT_PUBLIC_CLOUDFLARE_MEDIA_HOST` and start with `NEXT_PUBLIC_` to be accessible in browser
3. **Check URL Format**: Should be `https://pub-{account-id}.r2.dev` (no trailing slash)
4. **Check Build**: For production, ensure env vars are set in your hosting platform

## Production Deployment

1. **Set Environment Variable** in your hosting platform (Vercel, etc.):
   ```
   NEXT_PUBLIC_CLOUDFLARE_MEDIA_HOST=https://pub-{account-id}.r2.dev
   ```
   **Important**: No trailing slash in the URL

2. **Verify Audio Files** are uploaded to R2 bucket

3. **Test URLs** before sharing with users:
   ```
   /christmas?name=TestUser&audio=test-audio.mp3
   ```

## Security Considerations

- ✅ Public R2 buckets are read-only by default
- ✅ No authentication required for viewing (intentional for Christmas messages)
- ✅ Consider rate limiting if expecting high traffic
- ✅ Monitor R2 usage to stay within free tier limits

## Cost Estimation

For 50 users with ~1MB audio files each:
- **Storage**: 50MB = **FREE** (within 10GB limit)
- **Reads**: 50 requests = **FREE** (within 1M limit)
- **Egress**: **FREE** (no egress fees on R2)
- **Total**: **$0/month** ✅

## Support

If you encounter issues:
1. Check Cloudflare R2 dashboard for bucket status
2. Verify audio files are accessible via direct URL
3. Check browser console for errors
4. Verify environment variables are set correctly

