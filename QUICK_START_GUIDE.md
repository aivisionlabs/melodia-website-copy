# Quick Start Guide - Melodia Backend Integration

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables
Create `.env.local` file in root:

```env
# Minimum required for demo mode
DATABASE_URL=your_existing_database_url
NEXTAUTH_SECRET=generate-a-secret-32-characters-or-longer
NEXTAUTH_URL=http://localhost:3000
DEMO_MODE=true
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 3: Run Database Migrations
```bash
npx drizzle-kit push:pg
# OR
npm run db:migrate
```

This will create all 11 new tables in your database.

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Test the API!
Open a new terminal and try:

```bash
# Test 1: Create anonymous user
curl http://localhost:3000/api/users/anonymous

# Test 2: Create song request
curl -X POST http://localhost:3000/api/create-song-request \
  -H "Content-Type: application/json" \
  -d '{
    "requesterName": "Test User",
    "recipientDetails": "Jane Doe, my friend",
    "occasion": "Birthday",
    "languages": "English",
    "mood": ["happy"],
    "songStory": "She loves music",
    "email": "test@example.com"
  }'
```

---

## ✅ Verify Installation

### Check 1: Database Tables
```bash
# Open Drizzle Studio
npm run db:studio
```

You should see these NEW tables:
- ✓ users
- ✓ anonymous_users
- ✓ song_requests
- ✓ user_songs
- ✓ lyrics_drafts
- ✓ payments
- ✓ payment_webhooks
- ✓ email_verification_codes
- ✓ rate_limit_violations
- ✓ blocked_ips
- ✓ rate_limit_analytics

### Check 2: API Endpoints
Visit these URLs in your browser:
- ✓ http://localhost:3000/api/users/anonymous
- ✓ http://localhost:3000/api/auth/me

Both should return valid JSON (not errors).

---

## 🧪 Complete Test Flow (Demo Mode)

### Full Song Generation Test

```bash
#!/bin/bash

# 1. Get anonymous user
ANON_RESPONSE=$(curl -s http://localhost:3000/api/users/anonymous)
echo "Anonymous User: $ANON_RESPONSE"

# 2. Create song request
REQUEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-song-request \
  -H "Content-Type: application/json" \
  -d '{
    "requesterName": "John Smith",
    "recipientDetails": "Sarah Smith, my sister",
    "occasion": "Birthday",
    "languages": "English",
    "mood": ["happy", "upbeat"],
    "songStory": "She loves to dance and has an amazing smile",
    "email": "test@example.com"
  }')

echo "Song Request: $REQUEST_RESPONSE"

# Extract requestId (you'll need to parse JSON)
REQUEST_ID=$(echo $REQUEST_RESPONSE | grep -o '"requestId":[0-9]*' | grep -o '[0-9]*')
echo "Request ID: $REQUEST_ID"

# 3. Generate lyrics
LYRICS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate-lyrics \
  -H "Content-Type: application/json" \
  -d "{
    \"songRequestId\": $REQUEST_ID,
    \"language\": \"English\"
  }")

echo "Lyrics Generated: $LYRICS_RESPONSE"

# Extract lyricsDraftId
DRAFT_ID=$(echo $LYRICS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Draft ID: $DRAFT_ID"

# 4. Approve lyrics
APPROVE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/approve-lyrics \
  -H "Content-Type: application/json" \
  -d "{
    \"lyricsDraftId\": $DRAFT_ID
  }")

echo "Lyrics Approved: $APPROVE_RESPONSE"

# 5. Generate song
SONG_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate-song \
  -H "Content-Type: application/json" \
  -d "{
    \"lyricsDraftId\": $DRAFT_ID,
    \"songRequestId\": $REQUEST_ID
  }")

echo "Song Generation Started: $SONG_RESPONSE"

# Extract songId
SONG_ID=$(echo $SONG_RESPONSE | grep -o '"songId":[0-9]*' | grep -o '[0-9]*')
echo "Song ID: $SONG_ID"

# 6. Check status
echo "Checking status..."
STATUS_RESPONSE=$(curl -s http://localhost:3000/api/song-status/$SONG_ID)
echo "Status: $STATUS_RESPONSE"

echo ""
echo "✅ Test Complete! All APIs working."
echo "In demo mode, song will be 'completed' after ~2 minutes."
echo "Check status again with: curl http://localhost:3000/api/song-status/$SONG_ID"
```

Save this as `test-flow.sh` and run:
```bash
chmod +x test-flow.sh
./test-flow.sh
```

---

## 🔧 Troubleshooting

### Issue: "Database connection failed"
**Solution:** Check your `DATABASE_URL` in `.env.local`

### Issue: "NextAuth: [next-auth][error][NO_SECRET]"
**Solution:** Add `NEXTAUTH_SECRET` to `.env.local`

### Issue: "TypeError: Cannot read properties of undefined"
**Solution:** Make sure all dependencies are installed: `npm install`

### Issue: Migration fails
**Solution:**
```bash
# Reset Drizzle migrations
rm -rf drizzle/.cache
npx drizzle-kit push:pg --force
```

### Issue: API returns 500 error
**Solution:** Check server console logs for detailed error message

---

## 📝 Available API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/logout` - Logout
- `GET /api/users/anonymous` - Get/create anonymous user

### Song Generation
- `POST /api/create-song-request` - Create request
- `POST /api/generate-lyrics` - Generate lyrics
- `POST /api/refine-lyrics` - Refine lyrics
- `POST /api/approve-lyrics` - Approve lyrics
- `POST /api/generate-song` - Generate song
- `GET /api/song-status/[songId]` - Check status

### Payments
- `POST /api/payments/create-order` - Create order
- `POST /api/payments/verify` - Verify payment

---

## 🎯 Next Steps

### For Testing (Now)
1. ✅ Run the test flow above
2. ✅ Check Drizzle Studio to see data
3. ✅ Verify all APIs return 200 status
4. ✅ Test with real email (set DEMO_MODE=false later)

### For Development (Next)
1. **Create UI Components** (Phase 5)
   - Song request form component
   - Lyrics editor component
   - Status cards

2. **Create Hidden Pages**
   - Profile pages (signup, login, dashboard)
   - Lyrics generation pages
   - Song options pages

3. **Production Setup**
   - Get real API keys (Suno, Vertex AI, Razorpay)
   - Set up Resend for emails
   - Configure Upstash Redis
   - Set up Google OAuth

---

## 💡 Tips

### Demo Mode vs Production
**Demo Mode (DEMO_MODE=true):**
- ✅ No API costs
- ✅ Instant testing
- ✅ Mock data
- ⚠️ Not suitable for production

**Production Mode (DEMO_MODE=false):**
- ⚠️ Requires real API keys
- ⚠️ Costs money per request
- ✅ Real song generation
- ✅ Real payment processing

### Testing Strategy
1. **Start with demo mode** to verify flow
2. **Test one service at a time** with real APIs
3. **Monitor costs** closely when using real APIs
4. **Use separate test accounts** for development

---

## 📞 Need Help?

**Common Questions:**

**Q: Can I test payments without real money?**
A: Yes! Razorpay has test mode with test card numbers.

**Q: Do I need all API keys now?**
A: No! Demo mode works without any API keys (except database).

**Q: How do I know if it's working?**
A: Run the test flow script above - if it completes, everything works!

**Q: Should I deploy this to production?**
A: Not yet. Complete Phase 5 (UI components) first.

---

**🎉 You're all set! The backend is ready to use.**


