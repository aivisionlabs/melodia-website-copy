# Razorpay Payment Integration - Complete Analysis

## 📋 Overview

This document provides a comprehensive analysis of the Razorpay payment integration in the Melodia website project. It covers the complete payment flow, all APIs, routes, pages, and related components.

---

## 🏗️ Architecture Overview

### Payment Flow Diagram

```
User clicks "Pay" 
    ↓
Frontend: /payment page
    ↓
1. Load Razorpay Checkout Script (CDN)
    ↓
2. POST /api/payments/create-order
    ├─ Creates Razorpay Order
    ├─ Creates payment record (status: pending)
    └─ Returns: { orderId, amount, key, paymentId }
    ↓
3. Open Razorpay Checkout Modal
    ├─ User enters payment details
    └─ User completes payment
    ↓
4. Razorpay Callback: handleRazorpaySuccess()
    ├─ Receives: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    ↓
5. POST /api/payments/verify
    ├─ Verifies signature
    ├─ Updates payment status: pending → completed
    ├─ Links payment to song (if exists)
    ├─ Sends payment confirmation email
    └─ Returns: { success, paymentId }
    ↓
6. POST /api/payments/success
    ├─ Verifies payment is completed
    ├─ Checks for approved lyrics
    ├─ Calls /api/generate-song
    ├─ Links payment to song
    └─ Returns: { success, songId }
    ↓
7. Redirect to /song-options/{songId}
```

### Webhook Flow (Server-side)

```
Razorpay sends webhook event
    ↓
POST /api/payments/webhook
    ├─ Verifies webhook signature
    ├─ Checks idempotency (event_id)
    ├─ Updates payment status based on event
    └─ Logs webhook to database
```

---

## 📁 File Structure

### Frontend Files

#### 1. Payment Page
**File:** `src/app/payment/page.tsx`
- **Route:** `/payment?requestId={id}`
- **Purpose:** Main payment page where users complete payment
- **Key Features:**
  - Loads Razorpay Checkout script from CDN
  - Checks payment status on page load
  - Handles Prime customer flow (package_999)
  - Shows payment summary and order details
  - Opens Razorpay Checkout modal
  - Handles payment success/failure/cancellation

**Key Functions:**
- `handlePayment()` - Creates order and opens Razorpay Checkout
- `handleRazorpaySuccess()` - Handles payment success callback
- `handlePaymentCancelled()` - Handles payment cancellation
- `checkPaymentStatus()` - Checks if payment already completed

**State Management:**
- `scriptLoaded` - Razorpay script loading status
- `creatingOrder` - Order creation in progress
- `loading` - Payment processing
- `isPrimeCustomer` - Prime package detection
- `packagePrice` - Package price from song request

---

### API Routes

#### 1. Create Order API
**File:** `src/app/api/payments/create-order/route.ts`
- **Endpoint:** `POST /api/payments/create-order`
- **Purpose:** Creates Razorpay order and payment record
- **Request Body:**
  ```json
  {
    "songRequestId": 123,
    "amount": 299  // in rupees
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "orderId": "order_xyz",
    "amount": 29900,  // in paise
    "currency": "INR",
    "paymentId": 456,
    "key": "rzp_test_xxx"
  }
  ```
- **Process:**
  1. Validates request (songRequestId, amount)
  2. Gets user (authenticated or anonymous)
  3. Fetches song request to get package_id
  4. Creates Razorpay order via `createOrder()`
  5. Creates payment record in database (status: pending)
  6. Returns order details for frontend

**Rate Limiting:** Yes (`payment.create_order`)

---

#### 2. Verify Payment API
**File:** `src/app/api/payments/verify/route.ts`
- **Endpoint:** `POST /api/payments/verify`
- **Purpose:** Verifies Razorpay payment signature and updates payment status
- **Request Body:**
  ```json
  {
    "razorpay_payment_id": "pay_xyz",
    "razorpay_order_id": "order_xyz",
    "razorpay_signature": "signature_hash"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Payment verified successfully",
    "paymentId": 456
  }
  ```
- **Process:**
  1. Validates request schema
  2. Verifies signature using `verifyPaymentSignature()`
  3. Finds payment record by `razorpay_order_id`
  4. **Idempotency check:** Skips if already verified with same payment_id
  5. Updates payment status: `pending → completed` (atomic update)
  6. Updates `razorpay_payment_id` if not set
  7. Links payment to existing song (if exists)
  8. Updates partner visit with payment_id (if applicable)
  9. Sends payment confirmation email (only if newly verified)
  10. Returns success response

**Key Features:**
- Atomic status updates (prevents race conditions)
- Idempotent (safe to call multiple times)
- Email notifications
- Partner tracking integration

---

#### 3. Payment Success API
**File:** `src/app/api/payments/success/route.ts`
- **Endpoint:** `POST /api/payments/success`
- **Purpose:** Triggers song generation after payment verification
- **Request Body:**
  ```json
  {
    "paymentId": 456,
    "requestId": 123
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "songId": 789,
    "message": "Song created successfully"
  }
  ```
- **Process:**
  1. Validates payment exists and is completed
  2. Gets song request with package info
  3. **Prime Customer Check:**
     - If `package_999` (Prime): Returns success, skips song generation
     - Team handles Prime requests manually
  4. **Non-Prime Flow:**
     - Gets approved lyrics for request
     - Calls `/api/generate-song` internally
     - Links payment to newly created song
     - Updates song request status to `processing`
  5. Returns song ID for redirect

**Special Handling:**
- Prime customers (package_999) skip automatic song generation
- Requires approved lyrics for non-Prime customers

---

#### 4. Payment Webhook API
**File:** `src/app/api/payments/webhook/route.ts`
- **Endpoint:** `POST /api/payments/webhook`
- **Purpose:** Handles Razorpay webhook events for payment status updates
- **Headers:**
  - `x-razorpay-signature`: Webhook signature for verification
- **Request Body:** Raw JSON (for signature verification)
- **Process:**
  1. Reads raw body (required for signature verification)
  2. Verifies webhook signature using `verifyWebhookSignature()`
  3. Parses JSON payload
  4. Extracts event type and event ID
  5. **Idempotency Check:** Skips if event already processed
  6. Finds payment record by `razorpay_order_id` or `razorpay_payment_id`
  7. Maps event type to payment status:
     - `payment.captured` → `completed`
     - `order.paid` → `completed`
     - `payment.failed` → `failed`
     - `refund.processed` → `refunded`
  8. Updates payment status (atomic update)
  9. Updates `razorpay_payment_id` if present
  10. Logs webhook to `payment_webhooks` table
  11. Returns success response

**Event Types Handled:**
- `payment.captured` - Payment successfully captured
- `order.paid` - Order paid
- `payment.failed` - Payment failed
- `refund.processed` - Refund processed
- `payment.authorized` - Payment authorized (no status change)

**Key Features:**
- Idempotent processing (event_id based)
- Atomic status updates
- Comprehensive logging
- Graceful error handling

---

#### 5. Check Payment Status API
**File:** `src/app/api/payments/check-status/route.ts`
- **Endpoint:** `GET /api/payments/check-status?requestId=123`
- **Purpose:** Returns comprehensive payment, song, lyrics, and package status
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "payment": {
        "id": 456,
        "status": "completed",
        "amount": "299.00",
        "currency": "INR"
      },
      "song": {
        "id": 789,
        "status": "processing",
        "slug": "song-slug"
      },
      "hasApprovedLyrics": true,
      "isPrimeCustomer": false,
      "songRequestStatus": "processing"
    }
  }
  ```
- **Process:**
  1. Gets all payments for request (ordered by created_at DESC)
  2. Prioritizes completed payment, falls back to latest
  3. Gets song if exists
  4. Checks for approved lyrics
  5. Gets package info to determine Prime customer
  6. Returns comprehensive status

---

#### 6. Check Payment API (Simple)
**File:** `src/app/api/payments/check/route.ts`
- **Endpoint:** `GET /api/payments/check?requestId=123`
- **Purpose:** Simple check if payment is completed
- **Response:**
  ```json
  {
    "success": true,
    "isCompleted": true,
    "isPrime": false
  }
  ```
- **Process:**
  1. Checks if completed payment exists for request
  2. Gets package info for Prime check
  3. Returns simple boolean response

---

### Library Files

#### Razorpay Helper Library
**File:** `src/lib/razorpay.ts`
- **Purpose:** Razorpay SDK wrapper and utility functions
- **Functions:**
  - `getRazorpay()` - Gets Razorpay instance (singleton)
  - `createOrder(options)` - Creates Razorpay order
    - Converts rupees to paise
    - Returns order details
  - `verifyPaymentSignature(orderId, paymentId, signature)` - Verifies payment signature
    - Uses HMAC SHA256
    - Format: `orderId|paymentId`
  - `verifyWebhookSignature(body, signature)` - Verifies webhook signature
    - Uses webhook secret
    - HMAC SHA256
  - `getPayment(paymentId)` - Fetches payment details from Razorpay
  - `createRefund(paymentId, amount?)` - Initiates refund

**Environment Variables:**
- `RAZORPAY_KEY_ID` - Razorpay API key ID
- `RAZORPAY_KEY_SECRET` - Razorpay API secret
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signature secret

---

### Type Definitions

**File:** `src/types/razorpay.ts`
- **Interfaces:**
  - `RazorpayOptions` - Checkout configuration
  - `RazorpayPaymentResponse` - Payment callback response
  - `RazorpayInstance` - Razorpay instance methods
  - `CreateOrderResponse` - Create order API response
  - `VerifyPaymentResponse` - Verify payment API response
  - `PaymentSuccessResponse` - Payment success API response

---

## 🗄️ Database Schema

### Payments Table
**Table:** `payments`
**Schema:**
```sql
- id: serial (PK)
- song_request_id: integer (FK to song_requests)
- package_id: integer (FK to packages)
- user_id: integer (FK to users, nullable)
- anonymous_user_id: uuid (FK to anonymous_users, nullable)
- razorpay_payment_id: text (unique, nullable)
- razorpay_order_id: text (nullable)
- amount: numeric(10,2) (required)
- currency: text (default: 'INR')
- status: text (default: 'pending')
  - Values: 'pending', 'completed', 'failed', 'refunded'
- payment_method: text (nullable)
- created_at: timestamp (default: now())
- updated_at: timestamp (default: now())
- metadata: jsonb (nullable)
```

**Indexes:**
- `razorpay_payment_id` (unique)
- `razorpay_order_id` (for lookups)

---

### Payment Webhooks Table
**Table:** `payment_webhooks`
**Schema:**
```sql
- id: serial (PK)
- razorpay_event_id: text (unique)
- event_type: text (required)
- payment_id: integer (FK to payments, nullable)
- webhook_data: jsonb (required)
- processed: boolean (default: false)
- created_at: timestamp (default: now())
- processed_at: timestamp (nullable)
```

**Purpose:** Idempotency tracking and webhook logging

---

## 🔄 Complete Payment Flow

### 1. User Initiates Payment

**Frontend:** `/payment?requestId=123`

1. Page loads
2. Loads Razorpay Checkout script from CDN
3. Checks payment status via `/api/payments/check-status`
4. If payment already completed:
   - Shows success message
   - Redirects to song page (if song exists)
   - Shows Prime success popup (if Prime customer)
5. If payment pending:
   - Shows payment form
   - Displays package price
   - Shows Prime popup (if Prime customer)

---

### 2. Create Order

**User clicks "Pay" button**

1. Frontend calls `POST /api/payments/create-order`
   ```json
   {
     "songRequestId": 123,
     "amount": 299
   }
   ```

2. API:
   - Validates request
   - Gets user (authenticated or anonymous)
   - Fetches song request
   - Creates Razorpay order (amount in paise)
   - Creates payment record (status: pending)
   - Returns order details

3. Frontend receives:
   ```json
   {
     "success": true,
     "orderId": "order_xyz",
     "amount": 29900,
     "currency": "INR",
     "paymentId": 456,
     "key": "rzp_test_xxx"
   }
   ```

---

### 3. Open Razorpay Checkout

**Frontend:** Opens Razorpay Checkout modal

```javascript
const options = {
  key: data.key,
  amount: data.amount,  // in paise
  currency: "INR",
  name: "Melodia",
  description: "Personalized Song Generation",
  order_id: data.orderId,
  handler: handleRazorpaySuccess,
  prefill: userPrefill,
  theme: { color: "#EF476F" },
  modal: { ondismiss: handlePaymentCancelled }
};

const razorpay = new window.Razorpay(options);
razorpay.open();
```

**User Actions:**
- Enters payment details
- Completes payment
- OR cancels payment

---

### 4. Payment Success Callback

**Razorpay calls:** `handleRazorpaySuccess(response)`

**Response:**
```javascript
{
  razorpay_payment_id: "pay_xyz",
  razorpay_order_id: "order_xyz",
  razorpay_signature: "signature_hash"
}
```

**Frontend Process:**
1. Calls `POST /api/payments/verify` with payment details
2. If verification succeeds:
   - Calls `POST /api/payments/success`
   - If Prime customer: Shows success popup
   - If non-Prime: Redirects to `/song-options/{songId}`
3. If verification fails:
   - Shows error message
   - User can retry

---

### 5. Verify Payment

**API:** `POST /api/payments/verify`

**Process:**
1. Verifies signature using HMAC SHA256
2. Finds payment by `razorpay_order_id`
3. **Idempotency:** Skips if already verified
4. Updates status: `pending → completed` (atomic)
5. Updates `razorpay_payment_id`
6. Links payment to song (if exists)
7. Sends payment confirmation email
8. Returns `paymentId`

---

### 6. Trigger Song Generation

**API:** `POST /api/payments/success`

**Process:**
1. Verifies payment is completed
2. Gets song request and package info
3. **Prime Check:**
   - If Prime: Returns success (team handles manually)
4. **Non-Prime:**
   - Gets approved lyrics
   - Calls `/api/generate-song` internally
   - Links payment to song
   - Updates song request status
5. Returns `songId` for redirect

---

### 7. Webhook Processing (Server-side)

**Razorpay sends webhook** → `POST /api/payments/webhook`

**Process:**
1. Verifies webhook signature
2. Parses event payload
3. Checks idempotency (event_id)
4. Finds payment record
5. Maps event to status:
   - `payment.captured` → `completed`
   - `order.paid` → `completed`
   - `payment.failed` → `failed`
   - `refund.processed` → `refunded`
6. Updates payment status (atomic)
7. Logs webhook to database
8. Returns success

**Webhook Events:**
- `payment.captured` - Payment captured
- `order.paid` - Order paid
- `payment.failed` - Payment failed
- `refund.processed` - Refund processed
- `payment.authorized` - Payment authorized (no status change)

---

## 🔐 Security Features

### 1. Signature Verification
- **Payment Verification:** HMAC SHA256 with `RAZORPAY_KEY_SECRET`
- **Webhook Verification:** HMAC SHA256 with `RAZORPAY_WEBHOOK_SECRET`
- **Format:** `orderId|paymentId` for payment verification

### 2. Idempotency
- **Payment Verification:** Checks if already verified with same `razorpay_payment_id`
- **Webhook Processing:** Uses `razorpay_event_id` to prevent duplicate processing
- **Atomic Updates:** WHERE clauses prevent race conditions

### 3. Rate Limiting
- **Create Order:** Rate limited via `withRateLimit('payment.create_order')`

### 4. Input Validation
- **Zod Schemas:** All APIs validate input with Zod
- **Type Safety:** TypeScript types for all requests/responses

---

## 📧 Email Notifications

### Payment Confirmation Email
**Triggered:** When payment is verified (not already completed)
**Sent via:** `EmailFactory.getProvider().sendPaymentConfirmation()`
**Recipient:** Email from song request or user account
**Content:** Payment confirmation with amount and payment ID

**Prevents Duplicates:**
- Only sends if payment was just verified (not already completed)
- Idempotent email sending

---

## 🎯 Special Flows

### Prime Customer Flow (package_999)

1. **Payment Page:**
   - Shows Prime popup on load
   - Payment proceeds normally

2. **Payment Success:**
   - `POST /api/payments/success` detects Prime package
   - Skips automatic song generation
   - Returns `isPrimeCustomer: true`
   - Shows Prime success message
   - Team handles manually

3. **My Songs Page:**
   - Shows "Generate Song" button for pending Prime requests
   - Team can trigger generation manually

---

### Anonymous User Flow

1. **Session Management:**
   - Uses `anonymous_user_id` cookie
   - Creates anonymous user if needed
   - Links payment to anonymous user

2. **Payment Processing:**
   - Same flow as authenticated users
   - Payment linked via `anonymous_user_id`

---

## 🔍 Status Checking

### Payment Status Scenarios

**Scenario 1-3:** No payment or payment pending/failed
- Shows payment page normally

**Scenario 4:** Payment completed + Song exists + Song completed
- Redirects to `/song-options/{songId}`

**Scenario 5:** Payment completed + Song exists + Song processing
- Shows "Song Generating" message
- Redirects to song page

**Scenario 6:** Payment completed + Song exists + Song failed
- Shows error message
- User can retry

**Scenario 7:** Payment completed + No song + No approved lyrics
- Shows error
- Redirects to lyrics page

**Scenario 8:** Payment completed + No song + Approved lyrics exist
- Triggers song generation automatically
- Redirects to song page

**Scenario 9:** Payment completed + Prime customer
- Shows Prime success popup
- Team handles manually

---

## 🛠️ Configuration

### Environment Variables

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Optional: Demo mode for AI (payments still work)
DEMO_MODE=false
```

### Razorpay Dashboard Setup

1. **Webhook Configuration:**
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events:
     - `payment.captured`
     - `order.paid`
     - `payment.authorized`
     - `payment.failed`
     - `refund.processed`
   - Secret: Set `RAZORPAY_WEBHOOK_SECRET`

2. **API Keys:**
   - Test Mode: Use test keys
   - Live Mode: Use live keys (after KYC)

---

## 📊 Error Handling

### Frontend Errors
- Script loading failures
- Order creation failures
- Payment verification failures
- Network errors
- All errors show user-friendly toast messages

### Backend Errors
- Invalid signatures → 400 Bad Request
- Payment not found → 404 Not Found
- Database errors → 500 Internal Server Error
- All errors logged to console

### Webhook Errors
- Invalid signature → 401 Unauthorized
- Missing event type → 400 Bad Request
- Processing errors → 500 (allows retry)
- All webhooks logged (even on error)

---

## 🧪 Testing

### Test Payment Flow

1. **Create Order:**
   ```bash
   curl -X POST http://localhost:3000/api/payments/create-order \
     -H "Content-Type: application/json" \
     -d '{"songRequestId": 123, "amount": 299}'
   ```

2. **Verify Payment (Test):**
   ```bash
   curl -X POST http://localhost:3000/api/payments/verify \
     -H "Content-Type: application/json" \
     -d '{
       "razorpay_payment_id": "pay_test_xyz",
       "razorpay_order_id": "order_test_xyz",
       "razorpay_signature": "test_signature"
     }'
   ```

3. **Check Status:**
   ```bash
   curl http://localhost:3000/api/payments/check-status?requestId=123
   ```

---

## 📝 Key Notes

1. **Amount Conversion:**
   - Frontend sends amount in rupees
   - API converts to paise (×100) for Razorpay
   - API returns amount in paise

2. **Idempotency:**
   - Payment verification is idempotent
   - Webhook processing is idempotent
   - Safe to retry on failures

3. **Atomic Updates:**
   - Status updates use WHERE clauses
   - Prevents race conditions
   - Ensures data consistency

4. **Prime Customers:**
   - Package slug: `package_999`
   - Skips automatic song generation
   - Team handles manually

5. **Email Notifications:**
   - Only sent on first verification
   - Prevents duplicate emails
   - Graceful failure (doesn't break payment)

---

## 🔗 Related Files

- **Frontend:** `src/app/payment/page.tsx`
- **APIs:**
  - `src/app/api/payments/create-order/route.ts`
  - `src/app/api/payments/verify/route.ts`
  - `src/app/api/payments/success/route.ts`
  - `src/app/api/payments/webhook/route.ts`
  - `src/app/api/payments/check-status/route.ts`
  - `src/app/api/payments/check/route.ts`
- **Library:** `src/lib/razorpay.ts`
- **Types:** `src/types/razorpay.ts`
- **Schema:** `src/lib/db/schema.ts` (payments, payment_webhooks tables)

---

## 🚀 Future Enhancements

1. **Refund Handling:**
   - UI for refund requests
   - Automatic refund processing
   - Refund status tracking

2. **Payment Methods:**
   - Support for multiple payment methods
   - Payment method selection UI

3. **Payment History:**
   - User payment history page
   - Payment receipts download

4. **Analytics:**
   - Payment success rate tracking
   - Revenue analytics
   - Payment method analytics

---

**Last Updated:** 2024
**Maintained By:** Development Team

