/**
 * Webhook Testing Script
 * Tests Razorpay webhook endpoint with different scenarios
 * 
 * Usage:
 *   npx tsx scripts/test-webhook.ts
 * 
 * Make sure:
 *   1. .env.local has RAZORPAY_WEBHOOK_SECRET=12345678
 *   2. Server is running on localhost:3000
 *   3. ngrok URL is configured in Razorpay dashboard
 */

import crypto from 'crypto';

const WEBHOOK_SECRET = '12345678';
const WEBHOOK_URL = 'https://327b469d68ec.ngrok-free.app/api/payments/webhook';
// For local testing, use: 'http://localhost:3000/api/payments/webhook';

// Test payment data (you can get real order_id from your database)
const TEST_ORDER_ID = 'order_test_1234567890';
const TEST_PAYMENT_ID = 'pay_test_9876543210';

/**
 * Generate webhook signature (same as Razorpay does)
 */
function generateWebhookSignature(body: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

/**
 * Create webhook payload for different event types
 */
function createWebhookPayload(eventType: string, orderId?: string, paymentId?: string) {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const payload: any = {
    entity: 'event',
    account_id: 'acc_test_123',
    event: eventType,
    contains: [],
    payload: {},
    created_at: Math.floor(Date.now() / 1000),
  };

  // Add event ID
  payload.id = eventId;

  // Create payload based on event type
  if (eventType === 'payment.captured' || eventType === 'payment.failed') {
    payload.payload = {
      payment: {
        entity: {
          id: paymentId || TEST_PAYMENT_ID,
          entity: 'payment',
          amount: 10000, // 100.00 INR in paise
          currency: 'INR',
          status: eventType === 'payment.captured' ? 'captured' : 'failed',
          order_id: orderId || TEST_ORDER_ID,
          method: 'card',
          created_at: Math.floor(Date.now() / 1000),
          captured: eventType === 'payment.captured',
          description: eventType === 'payment.captured' ? 'Payment captured' : 'Payment failed',
          error_code: eventType === 'payment.failed' ? 'BAD_REQUEST_ERROR' : null,
          error_description: eventType === 'payment.failed' ? 'Payment failed due to insufficient funds' : null,
        },
      },
    };
  } else if (eventType === 'order.paid') {
    payload.payload = {
      order: {
        entity: {
          id: orderId || TEST_ORDER_ID,
          entity: 'order',
          amount: 10000,
          currency: 'INR',
          status: 'paid',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
      payment: {
        entity: {
          id: paymentId || TEST_PAYMENT_ID,
          entity: 'payment',
          amount: 10000,
          currency: 'INR',
          status: 'captured',
          order_id: orderId || TEST_ORDER_ID,
        },
      },
    };
  } else if (eventType === 'refund.processed') {
    payload.payload = {
      refund: {
        entity: {
          id: `rfnd_${Date.now()}`,
          entity: 'refund',
          amount: 10000,
          currency: 'INR',
          payment_id: paymentId || TEST_PAYMENT_ID,
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
      payment: {
        entity: {
          id: paymentId || TEST_PAYMENT_ID,
          entity: 'payment',
          order_id: orderId || TEST_ORDER_ID,
        },
      },
    };
  }

  return payload;
}

/**
 * Test webhook with a specific event
 */
async function testWebhook(eventType: string, orderId?: string, paymentId?: string) {
  console.log(`\n🧪 Testing webhook: ${eventType}`);
  console.log('─'.repeat(60));

  // Create payload
  const payload = createWebhookPayload(eventType, orderId, paymentId);
  const body = JSON.stringify(payload);

  // Generate signature
  const signature = generateWebhookSignature(body, WEBHOOK_SECRET);

  console.log(`📦 Event ID: ${payload.id}`);
  console.log(`📝 Order ID: ${orderId || TEST_ORDER_ID}`);
  console.log(`💳 Payment ID: ${paymentId || TEST_PAYMENT_ID}`);
  console.log(`🔐 Signature: ${signature.substring(0, 20)}...`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: body,
    });

    const responseData = await response.json();
    const status = response.status;

    console.log(`\n📊 Response Status: ${status}`);
    console.log(`📄 Response Body:`, JSON.stringify(responseData, null, 2));

    if (status === 200 || status === 201) {
      console.log(`✅ Webhook processed successfully!`);
    } else {
      console.log(`❌ Webhook failed with status ${status}`);
    }

    return { success: status === 200 || status === 201, status, data: responseData };
  } catch (error: any) {
    console.error(`\n❌ Error testing webhook:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Webhook Tests');
  console.log('═'.repeat(60));
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Webhook Secret: ${WEBHOOK_SECRET}`);
  console.log('═'.repeat(60));

  const results: any[] = [];

  // Test 1: Payment Failed (Main test case)
  console.log('\n\n📋 TEST 1: Payment Failed');
  results.push(await testWebhook('payment.failed'));

  // Test 2: Payment Captured
  console.log('\n\n📋 TEST 2: Payment Captured');
  results.push(await testWebhook('payment.captured'));

  // Test 3: Order Paid
  console.log('\n\n📋 TEST 3: Order Paid');
  results.push(await testWebhook('order.paid'));

  // Test 4: Refund Processed
  console.log('\n\n📋 TEST 4: Refund Processed');
  results.push(await testWebhook('refund.processed'));

  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('═'.repeat(60));

  // Instructions
  console.log('\n\n📝 HOW TO VERIFY WEBHOOK IS WORKING:');
  console.log('─'.repeat(60));
  console.log('1. Check Server Logs:');
  console.log('   Look for: "Webhook: Received event..." in your terminal');
  console.log('\n2. Check Database:');
  console.log('   Query: SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 5;');
  console.log('   You should see webhook events logged there.');
  console.log('\n3. Check Payment Status:');
  console.log('   Query: SELECT id, razorpay_order_id, status FROM payments WHERE razorpay_order_id = \'' + TEST_ORDER_ID + '\';');
  console.log('   Status should be updated based on event type.');
  console.log('\n4. Check ngrok Logs:');
  console.log('   Visit: http://localhost:4040 (ngrok dashboard)');
  console.log('   You should see POST requests to /api/payments/webhook');
  console.log('─'.repeat(60));
}

// Run tests
runTests().catch(console.error);

