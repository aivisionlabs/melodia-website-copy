# 🎵 Melodia API Flow Diagrams

## 📊 Complete User Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MELODIA USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────────────────┘

🌐 WEBSITE VISIT
    │
    ▼
┌─────────────────┐
│ Anonymous User  │ ──► POST /api/users/anonymous
│ Creation        │     (Auto-created by useAnonymousUser hook)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Song Request    │ ──► POST /api/create-song-request
│ Form Submission │     Body: { recipient_name, languages, additional_details,
│                 │              anonymous_user_id }
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Lyrics          │ ──► POST /api/generate-lyrics-with-storage
│ Generation      │     Body: { requestId, recipient_name, languages,
│                 │              additional_details }
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Review & Edit   │ ──► GET /api/lyrics-display?requestId=123
│ Lyrics          │     (User reviews generated lyrics)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Payment         │ ──► POST /api/payments/create-order
│ Creation        │     Body: { songRequestId, planId, anonymous_user_id }
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Razorpay        │ ──► User completes payment on Razorpay
│ Payment         │     (External payment gateway)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Payment         │ ──► POST /api/payments/verify
│ Verification    │     Body: { razorpay_payment_id, razorpay_order_id,
│                 │              razorpay_signature, anonymous_user_id }
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Song            │ ──► POST /api/generate-song
│ Generation      │     Body: { title, lyrics, style, recipient_name,
│                 │              requestId, userId/anonymous_user_id }
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Status          │ ──► GET /api/song-status/[taskId]
│ Monitoring      │     (Polling for completion)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Song Variants   │ ──► GET /api/song-variants/[songId]
│ Selection       │     (User selects preferred version)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Content         │ ──► GET /api/user-content?anonymousUserId=uuid
│ Management      │     (View all user's songs and lyrics)
└─────────────────┘
```

---

## 🔄 Anonymous User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ANONYMOUS USER FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ FIRST VISIT
   ┌─────────────────┐
   │ Website Load    │ ──► useAnonymousUser() hook triggers
   │                 │     POST /api/users/anonymous
   │                 │     Response: { anonymous_user_id: "uuid" }
   │                 │     Storage: localStorage.setItem("anonymous_user_id", uuid)
   └─────────────────┘

2️⃣ SONG CREATION
   ┌─────────────────┐
   │ Form Submit     │ ──► POST /api/create-song-request
   │                 │     Body: { ..., anonymous_user_id: uuid }
   │                 │     Response: { requestId: 123 }
   └─────────────────┘

3️⃣ PAYMENT FLOW
   ┌─────────────────┐
   │ Create Order    │ ──► POST /api/payments/create-order
   │                 │     Body: { songRequestId: 123, planId: 1, anonymous_user_id: uuid }
   │                 │     Response: { orderId: "order_123", key: "rzp_key", ... }
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Razorpay        │ ──► User pays on Razorpay
   │ Payment         │     (External gateway)
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Verify Payment  │ ──► POST /api/payments/verify
   │                 │     Body: { ..., anonymous_user_id: uuid }
   │                 │     Response: { success: true, paymentId: 456 }
   └─────────────────┘

4️⃣ CONTENT ACCESS
   ┌─────────────────┐
   │ View Content    │ ──► GET /api/user-content?anonymousUserId=uuid
   │                 │     Response: { content: [songs, lyrics_drafts, requests] }
   └─────────────────┘
```

---

## 🔐 Registered User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            REGISTERED USER FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ REGISTRATION
   ┌─────────────────┐
   │ Register        │ ──► POST /api/auth/register
   │                 │     Body: { email, password, name, anonymous_user_id? }
   │                 │     Response: { success: true, user: {...} }
   │                 │     Data Migration: Merges anonymous data automatically
   └─────────────────┘

2️⃣ LOGIN
   ┌─────────────────┐
   │ Login           │ ──► POST /api/auth/login
   │                 │     Body: { email, password, anonymous_user_id? }
   │                 │     Response: { success: true, user: {...} }
   │                 │     Session: localStorage.setItem("user-session", user)
   └─────────────────┘

3️⃣ SONG CREATION
   ┌─────────────────┐
   │ Form Submit     │ ──► POST /api/create-song-request
   │                 │     Body: { ..., user_id: 123 }
   │                 │     Response: { requestId: 124 }
   └─────────────────┘

4️⃣ PAYMENT FLOW
   ┌─────────────────┐
   │ Create Order    │ ──► POST /api/payments/create-order
   │                 │     Body: { songRequestId: 124, planId: 1, user_id: 123 }
   │                 │     Response: { orderId: "order_124", ... }
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Razorpay        │ ──► User pays on Razorpay
   │ Payment         │     (External gateway)
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Verify Payment  │ ──► POST /api/payments/verify
   │                 │     Body: { ..., user_id: 123 }
   │                 │     Response: { success: true, paymentId: 457 }
   └─────────────────┘

5️⃣ CONTENT ACCESS
   ┌─────────────────┐
   │ View Content    │ ──► GET /api/user-content?userId=123
   │                 │     Response: { content: [songs, lyrics_drafts, requests] }
   └─────────────────┘
```

---

## 🔄 User Migration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            USER MIGRATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

📱 ANONYMOUS ACTIVITY
   ┌─────────────────┐
   │ Anonymous User  │ ──► Creates songs, makes payments
   │ Activity        │     anonymous_user_id: "uuid-123"
   │                 │     Data stored with anonymous_user_id
   └─────────────────┘
   │
   ▼
🔐 REGISTRATION WITH MERGE
   ┌─────────────────┐
   │ Register        │ ──► POST /api/auth/register
   │                 │     Body: { email, password, name, anonymous_user_id: "uuid-123" }
   │                 │     Response: { success: true, user: { id: 456 } }
   └─────────────────┘
   │
   ▼
🔄 AUTOMATIC DATA MERGE
   ┌─────────────────┐
   │ Database        │ ──► UPDATE song_requests
   │ Migration       │     SET user_id = 456, anonymous_user_id = NULL
   │                 │     WHERE anonymous_user_id = "uuid-123"
   │                 │
   │                 │     UPDATE payments
   │                 │     SET user_id = 456, anonymous_user_id = NULL
   │                 │     WHERE anonymous_user_id = "uuid-123"
   │                 │
   │                 │     DELETE FROM anonymous_users
   │                 │     WHERE id = "uuid-123"
   └─────────────────┘
   │
   ▼
✅ MIGRATION COMPLETE
   ┌─────────────────┐
   │ User Now Has    │ ──► All previous anonymous data now belongs to user 456
   │ Registered      │     User can access all their songs and payments
   │ Account         │     Anonymous session cleared from localStorage
   └─────────────────┘
```

---

## 💳 Payment Flow Detail

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT FLOW DETAIL                               │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ INITIATE PAYMENT
   ┌─────────────────┐
   │ Frontend        │ ──► User clicks "Pay Now"
   │                 │     PaymentModal component opens
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Create Order    │ ──► POST /api/payments/create-order
   │                 │     Body: { songRequestId, planId, user_id/anonymous_user_id }
   │                 │     Response: { orderId, amount, key, prefill, ... }
   └─────────────────┘

2️⃣ RAZORPAY PAYMENT
   ┌─────────────────┐
   │ Razorpay        │ ──► RazorpayCheckout opens
   │ Checkout        │     User enters payment details
   │                 │     Payment processed by Razorpay
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Payment         │ ──► Razorpay sends callback
   │ Callback        │     Frontend receives payment details
   └─────────────────┘

3️⃣ VERIFY PAYMENT
   ┌─────────────────┐
   │ Verify          │ ──► POST /api/payments/verify
   │                 │     Body: { razorpay_payment_id, razorpay_order_id,
   │                 │              razorpay_signature, user_id/anonymous_user_id }
   │                 │     Response: { success: true, paymentId }
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Update Status   │ ──► Database updated:
   │                 │     - payment.status = "completed"
   │                 │     - song_request.payment_status = "paid"
   │                 │     - song.payment_id = paymentId
   └─────────────────┘

4️⃣ PROCEED TO SONG GENERATION
   ┌─────────────────┐
   │ Generate Song   │ ──► POST /api/generate-song
   │                 │     Payment check passes
   │                 │     Song generation starts
   └─────────────────┘
```

---

## 🎵 Song Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SONG GENERATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ INITIATE GENERATION
   ┌─────────────────┐
   │ User Approval   │ ──► User clicks "Generate Song"
   │                 │     Frontend calls generate-song API
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Generate Song   │ ──► POST /api/generate-song
   │                 │     Body: { title, lyrics, style, recipient_name,
   │                 │              requestId, userId/anonymous_user_id }
   │                 │     Response: { success: true, taskId, songId }
   └─────────────────┘

2️⃣ SUNO API INTEGRATION
   ┌─────────────────┐
   │ Suno API        │ ──► API call to Suno service
   │                 │     Request: { prompt, style, title, customMode }
   │                 │     Response: { taskId: "suno-task-123" }
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Database        │ ──► Create song record:
   │ Update          │     - songs.status = "processing"
   │                 │     - songs.suno_task_id = "suno-task-123"
   │                 │     - song_requests.status = "processing"
   └─────────────────┘

3️⃣ STATUS MONITORING
   ┌─────────────────┐
   │ Status Polling   │ ──► GET /api/song-status/[taskId]
   │                 │     Frontend polls every 10 seconds
   │                 │     Response: { status: "processing/completed/failed" }
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Suno Webhook    │ ──► POST /api/suno-webhook
   │                 │     Suno sends status updates
   │                 │     Database updated with final results
   └─────────────────┘

4️⃣ COMPLETION
   ┌─────────────────┐
   │ Song Ready      │ ──► Status changes to "completed"
   │                 │     Audio URLs available
   │                 │     Frontend shows "Listen" button
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Variants        │ ──► GET /api/song-variants/[songId]
   │                 │     User can select preferred version
   │                 │     Response: { variants: [...] }
   └─────────────────┘
```

---

## 🔍 Content Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CONTENT MANAGEMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ CONTENT RETRIEVAL
   ┌─────────────────┐
   │ My Songs Page   │ ──► GET /api/user-content
   │                 │     Query: ?userId=123 OR ?anonymousUserId=uuid
   │                 │     Response: { content: [...] }
   └─────────────────┘

2️⃣ CONTENT TYPES
   ┌─────────────────┐
   │ Song Request    │ ──► Type: "song_request"
   │                 │     Status: "pending"
   │                 │     Action: "Create Lyrics"
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Lyrics Draft    │ ──► Type: "lyrics_draft"
   │                 │     Status: "draft/needs_review/approved"
   │                 │     Action: "Generate Song" / "Review Lyrics"
   └─────────────────┘
   │
   ┌─────────────────┐
   │ Song            │ ──► Type: "song"
   │                 │     Status: "processing/ready/failed"
   │                 │     Action: "Listen" / "View Progress" / "Retry"
   └─────────────────┘

3️⃣ DYNAMIC BUTTONS
   ┌─────────────────┐
   │ Button Logic    │ ──► getButtonForContent(item)
   │                 │     Returns: { text, action, variant }
   │                 │     Based on content type and status
   └─────────────────┘

4️⃣ CONTENT ACTIONS
   ┌─────────────────┐
   │ Delete Content  │ ──► POST /api/delete-content
   │                 │     Body: { contentId, contentType }
   │                 │     Removes from database
   └─────────────────┘
```

---

## 🚨 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ERROR HANDLING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ VALIDATION ERRORS
   ┌─────────────────┐
   │ Input           │ ──► 400 Bad Request
   │ Validation      │     Response: { success: false, message: "Missing fields" }
   └─────────────────┘

2️⃣ AUTHENTICATION ERRORS
   ┌─────────────────┐
   │ Auth Required   │ ──► 401 Unauthorized
   │                 │     Response: { success: false, message: "Auth required" }
   └─────────────────┘

3️⃣ AUTHORIZATION ERRORS
   ┌─────────────────┐
   │ Access Denied   │ ──► 403 Forbidden
   │                 │     Response: { success: false, message: "Unauthorized" }
   └─────────────────┘

4️⃣ PAYMENT ERRORS
   ┌─────────────────┐
   │ Payment         │ ──► 402 Payment Required
   │ Required        │     Response: { success: false, requiresPayment: true }
   └─────────────────┘

5️⃣ RATE LIMITING
   ┌─────────────────┐
   │ Too Many        │ ──► 429 Too Many Requests
   │ Requests        │     Response: { success: false, retryAfter: 3600 }
   └─────────────────┘

6️⃣ SERVER ERRORS
   ┌─────────────────┐
   │ Internal        │ ──► 500 Internal Server Error
   │ Error           │     Response: { success: false, message: "Server error" }
   └─────────────────┘
```

---

## 🔧 Development & Testing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DEVELOPMENT & TESTING FLOW                          │
└─────────────────────────────────────────────────────────────────────────────────┘

1️⃣ DEMO MODE
   ┌─────────────────┐
   │ Demo Mode       │ ──► Set demoMode: true in requests
   │                 │     - No real AI API calls
   │                 │     - Mock responses returned
   │                 │     - Database still updated
   └─────────────────┘

2️⃣ TESTING ENDPOINTS
   ┌─────────────────┐
   │ Test APIs       │ ──► Use demo data for testing
   │                 │     - Avoid hitting real APIs
   │                 │     - Test database operations
   │                 │     - Verify error handling
   └─────────────────┘

3️⃣ VALIDATION
   ┌─────────────────┐
   │ Input           │ ──► Validate all inputs
   │ Validation      │     - UUID format for anonymous users
   │                 │     - Required fields present
   │                 │     - Data types correct
   └─────────────────┘

4️⃣ SECURITY
   ┌─────────────────┐
   │ Security        │ ──► Rate limiting applied
   │ Checks          │     - IP-based limiting
   │                 │     - User ownership validation
   │                 │     - Input sanitization
   └─────────────────┘
```

---

*These flow diagrams show the complete API journey for Melodia, covering both anonymous and registered user experiences, payment flows, song generation, and content management.*
