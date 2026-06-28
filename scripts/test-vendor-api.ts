/**
 * Vendor (Partner) API Test Script
 * Tests all Partner API endpoints: templates, orders (create/list/detail)
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-vendor-api.ts dotenv_config_path=.env.local
 *
 * Related:
 *   - scripts/test-customer-templated-vendor-order.ts — `customer_templated_song` (co-branded name-drop) create, generate-template, poll, T2/T3 guards.
 *   - scripts/simulate-vendor-flow.ts — partner order flow simulation.
 *
 * Prerequisites:
 *   1. Server running on localhost:3000 (npm run dev)
 *   2. PARTNER_API_TEST_KEY set in .env.local  (a valid mel_pk_... key for a sandbox vendor)
 *   3. PARTNER_API_TEST_TEMPLATE_ID set in .env.local  (an active templated_song id)
 *
 * Optional:
 *   PARTNER_API_BASE_URL  – defaults to http://localhost:3000
 */

import crypto from 'crypto';

const BASE_URL = process.env.PARTNER_API_BASE_URL ?? 'http://localhost:3000';
const API_KEY = process.env.PARTNER_API_TEST_KEY ?? '';
const TEMPLATE_ID = parseInt(process.env.PARTNER_API_TEST_TEMPLATE_ID ?? '0', 10);

// ─── Helpers ──────────────────────────────────────────────────────────

function headers(key = API_KEY): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

function verifyWebhookSignature(body: string, secret: string, header: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  return header === expected;
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...headers(), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// ─── Test result tracking ─────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  message?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string): boolean {
  results.push({ name, passed: condition, message: detail });
  const icon = condition ? '✅' : '❌';
  const suffix = detail ? `  (${detail})` : '';
  console.log(`  ${icon} ${name}${suffix}`);
  return condition;
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── Tests ────────────────────────────────────────────────────────────

async function testAuth() {
  section('Auth – Missing & Invalid Keys');

  // Missing key
  const resMissing = await fetch(`${BASE_URL}/api/v1/partner/templates`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const missing = await resMissing.json() as any;
  assert('Missing API key → 401', resMissing.status === 401);
  assert('Missing key error code', missing?.error?.code === 'MISSING_API_KEY' || missing?.error?.code === 'UNAUTHORIZED');

  // Invalid key
  const resInvalid = await fetch(`${BASE_URL}/api/v1/partner/templates`, {
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mel_pk_invalid_key_000000000000000000000000000000000000000000000000000000000000' },
  });
  const invalid = await resInvalid.json() as any;
  assert('Invalid API key → 401', resInvalid.status === 401);
  assert('Invalid key has request_id', typeof invalid?.error?.request_id === 'string');
}

async function testListTemplates(): Promise<number | null> {
  section('GET /api/v1/partner/templates');

  const { status, data } = await request('GET', '/api/v1/partner/templates') as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Has templatedSongs array', Array.isArray(data?.templatedSongs));
  assert('Has pagination object', typeof data?.pagination === 'object');
  assert('Pagination has page', typeof data?.pagination?.page === 'number');
  assert('Pagination has total_count', typeof data?.pagination?.total_count === 'number');
  assert('Pagination has has_next_page', typeof data?.pagination?.has_next_page === 'boolean');

  // Template shape
  if (data?.templatedSongs?.length > 0) {
    const t = data.templatedSongs[0] as any;
    assert('Template has id', typeof t.id === 'number');
    assert('Template has title', typeof t.title === 'string');
    assert('Template has slug', typeof t.slug === 'string');
    assert(
      'Template has description',
      'description' in t && (t.description === null || typeof t.description === 'string'),
    );
    assert('Template has categories array', Array.isArray(t.categories));
  } else {
    console.log('  ⚠️  No templates returned — skipping shape assertions');
  }

  return data?.templatedSongs?.[0]?.id ?? null;
}

async function testListTemplatesWithOccasion() {
  section('GET /api/v1/partner/templates?occasion=birthday');

  const { status, data } = await request('GET', '/api/v1/partner/templates?occasion=birthday') as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Has templatedSongs', Array.isArray(data?.templatedSongs));

  // Pagination edge case: limit=1
  const { status: s2, data: d2 } = await request('GET', '/api/v1/partner/templates?limit=1') as any;
  assert('Limit=1 → status 200', s2 === 200);
  assert('Limit=1 → at most 1 result', Array.isArray(d2?.templatedSongs) && d2.templatedSongs.length <= 1);
}

async function testCreateOrder(templateId: number): Promise<{ orderId: number; instanceSlug: string } | null> {
  section('POST /api/v1/partner/orders');

  const externalId = `test-ext-${Date.now()}`;
  const idempotencyKey = `idem-${Date.now()}`;

  const { status, data } = await request('POST', '/api/v1/partner/orders', {
    product_type: 'customer_templated_song',
    external_order_id: externalId,
    template_id: templateId,
    recipient_name: 'Aisha',
    idempotency_key: idempotencyKey,
  }) as any;

  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Has order_id', typeof data?.order_id === 'number');
  const okCreateStatus =
    data?.status === 'song_generation_inprogress' ||
    data?.status === 'processing' ||
    data?.status === 'failed';
  assert('Status is expected after create', okCreateStatus, `got ${data?.status}`);
  if (data?.status === 'song_generation_inprogress') {
    assert('Has customer_link', typeof data?.customer_link === 'string');
    assert('Has order_token', typeof data?.order_token === 'string');
    assert('estimated_completion_minutes = 3', data?.estimated_completion_minutes === 3);
  }

  // Idempotency: same key → same order
  if (data?.order_id) {
    const { data: d2 } = await request('POST', '/api/v1/partner/orders', {
      product_type: 'customer_templated_song',
      external_order_id: `other-ext-${Date.now()}`, // different ext id
      template_id: templateId,
      recipient_name: 'Aisha',
      idempotency_key: idempotencyKey, // same key
    }) as any;
    assert('Idempotency returns same order_id', d2?.order_id === data.order_id);
  }

  if (typeof data?.order_id === 'number') {
    return { orderId: data.order_id, instanceSlug: data.instance_slug ?? '' };
  }
  return null;
}

async function testCreateOrderValidation(templateId: number) {
  section('POST /api/v1/partner/orders – Validation Errors');

  // Missing required field
  const { status: s1, data: d1 } = await request('POST', '/api/v1/partner/orders', {
    template_id: templateId,
    recipient_name: 'Riya',
    // missing external_order_id
  }) as any;
  assert('Missing external_order_id → 400', s1 === 400, `got ${s1}`);
  assert('Error code VALIDATION_ERROR', (d1 as any)?.error?.code === 'VALIDATION_ERROR');

  // Non-existent template
  const { status: s2, data: d2 } = await request('POST', '/api/v1/partner/orders', {
    product_type: 'customer_templated_song',
    external_order_id: `test-nonexistent-${Date.now()}`,
    template_id: 9999999,
    recipient_name: 'Riya',
  }) as any;
  assert('Non-existent template → 400', s2 === 400, `got ${s2}`);
  assert('Error code TEMPLATE_NOT_FOUND', (d2 as any)?.error?.code === 'TEMPLATE_NOT_FOUND');

  // Invalid product_type
  const { status: s3, data: d3 } = await request('POST', '/api/v1/partner/orders', {
    external_order_id: `test-invalid-type-${Date.now()}`,
    template_id: templateId,
    product_type: 'invalid_type',
    recipient_name: 'Riya',
  }) as any;
  assert('Invalid product_type → 400', s3 === 400, `got ${s3}`);
  assert('Validation error on product_type', (d3 as any)?.error?.code === 'VALIDATION_ERROR');
}

async function testSandboxSimulateFailure(templateId: number) {
  section('POST /api/v1/partner/orders – Sandbox Simulated Failure');

  const { status, data } = await request('POST', '/api/v1/partner/orders', {
    product_type: 'customer_templated_song',
    external_order_id: `test-sandbox-fail-${Date.now()}`,
    template_id: templateId,
    recipient_name: 'Dev Test',
    metadata: { simulate: 'failure' },
  }) as any;

  assert('Simulated failure → status 200', status === 200, `got ${status}`);
  assert('Simulated failure → order status = failed', data?.status === 'failed');
}

async function testListOrders() {
  section('GET /api/v1/partner/orders');

  const { status, data } = await request('GET', '/api/v1/partner/orders') as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Has orders array', Array.isArray(data?.orders));
  assert('Has pagination object', typeof data?.pagination === 'object');
  assert('Pagination has limit', typeof data?.pagination?.limit === 'number');
  assert('Pagination has has_more', typeof data?.pagination?.has_more === 'boolean');

  if (data?.orders?.length > 0) {
    const o = data.orders[0] as any;
    assert('Order has order_id', typeof o.order_id === 'number');
    assert('Order has external_order_id', typeof o.external_order_id === 'string');
    assert(
      'Order has status',
      ['pending', 'processing', 'song_generation_inprogress', 'completed', 'failed'].includes(o.status),
    );
    assert('Order has amount_charged', o.amount_charged !== undefined);
    assert('Order has currency', typeof o.currency === 'string');
    assert('Order has created_at', typeof o.created_at === 'string');
  }

  // Filter by status
  const { status: s2, data: d2 } = await request('GET', '/api/v1/partner/orders?status=processing') as any;
  assert('Filter by status=processing → 200', s2 === 200);
  if (Array.isArray(d2?.orders) && d2.orders.length > 0) {
    assert('All filtered orders are processing', (d2.orders as any[]).every((o) => o.status === 'processing'));
  }

  // Cursor-based pagination
  const { status: s3, data: d3 } = await request('GET', '/api/v1/partner/orders?limit=1') as any;
  assert('limit=1 returns at most 1 order', s3 === 200 && Array.isArray(d3?.orders) && d3.orders.length <= 1);
  if (d3?.pagination?.has_more && d3?.pagination?.next_cursor) {
    const { status: s4, data: d4 } = await request('GET', `/api/v1/partner/orders?limit=1&cursor=${d3.pagination.next_cursor}`) as any;
    assert('Cursor pagination → 200', s4 === 200);
    assert('Cursor page has orders array', Array.isArray(d4?.orders));
  }
}

async function testGetOrderDetail(orderId: number) {
  section(`GET /api/v1/partner/orders/${orderId}`);

  const { status, data } = await request('GET', `/api/v1/partner/orders/${orderId}`) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('order_id matches', data?.order_id === orderId);
  assert('Has external_order_id', typeof data?.external_order_id === 'string');
  assert('Has template_id', typeof data?.template_id === 'number');
  assert('Has recipient_name', typeof data?.recipient_name === 'string');
  assert(
    'Has status',
    ['pending', 'processing', 'song_generation_inprogress', 'completed', 'failed'].includes(data?.status),
  );
  assert('Has amount_charged', data?.amount_charged !== undefined);
  assert('Has currency', typeof data?.currency === 'string');
  assert('Has created_at', typeof data?.created_at === 'string');
  assert('Has updated_at', typeof data?.updated_at === 'string');

  if (data?.status === 'completed') {
    assert('Completed order has playback_url', typeof data?.playback_url === 'string');
    assert('playback_url contains vendor slug', (data.playback_url as string).includes('/vendor/'));
    assert('Completed order has instance_slug', typeof data?.instance_slug === 'string');
    assert('Completed order has completed_at', typeof data?.completed_at === 'string');
  }

  if (data?.status === 'failed') {
    assert('Failed order has completed_at', typeof data?.completed_at === 'string');
    assert('Failed order has error_message', data?.error_message !== undefined);
  }
}

async function testOrderNotFound() {
  section('GET /api/v1/partner/orders/[id] – Not Found & Cross-Vendor');

  // Non-existent
  const { status, data } = await request('GET', '/api/v1/partner/orders/999999999') as any;
  assert('Non-existent order → 404', status === 404, `got ${status}`);
  assert('Error code ORDER_NOT_FOUND', (data as any)?.error?.code === 'ORDER_NOT_FOUND');

  // Invalid id
  const { status: s2, data: d2 } = await request('GET', '/api/v1/partner/orders/not-a-number') as any;
  assert('Invalid order id → 400', s2 === 400, `got ${s2}`);
  assert('Error code INVALID_ORDER_ID', (d2 as any)?.error?.code === 'INVALID_ORDER_ID');
}

function testWebhookSigning() {
  section('Webhook Signature Verification');

  const secret = 'test-webhook-secret-32bytes-abcdef';
  const payload = JSON.stringify({
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    order_id: 1,
    external_order_id: 'ext-1',
    product_type: 'customer_templated_song',
    data: {
      status: 'completed',
      playback_url: 'https://melodia-songs.com/vendor/test/some-slug',
      song_title: 'Happy Birthday Aisha',
      instance_slug: 'some-slug',
      completed_at: new Date().toISOString(),
      amount_charged: '99.00',
      currency: 'INR',
    },
  });

  const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  assert('Valid signature verifies', verifyWebhookSignature(payload, secret, signature));
  assert('Tampered body fails', !verifyWebhookSignature(payload + 'x', secret, signature));
  assert('Wrong secret fails', !verifyWebhookSignature(payload, 'wrong-secret', signature));
  assert('Wrong prefix fails', !verifyWebhookSignature(payload, secret, signature.replace('sha256=', 'sha1=')));
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  Melodia Partner API Tests');
  console.log('═'.repeat(60));
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  API Key  : ${API_KEY ? API_KEY.slice(0, 12) + '...' : '⚠️  NOT SET (set PARTNER_API_TEST_KEY)'}`);
  console.log(`  Template : ${TEMPLATE_ID || '⚠️  NOT SET (set PARTNER_API_TEST_TEMPLATE_ID)'}`);

  if (!API_KEY) {
    console.log('\n❌ PARTNER_API_TEST_KEY is required. Aborting.');
    process.exit(1);
  }

  const effectiveTemplateId = TEMPLATE_ID > 0 ? TEMPLATE_ID : null;

  // Run auth tests first (they use intentionally wrong keys)
  await testAuth();

  // Templates
  const firstTemplateId = await testListTemplates();
  await testListTemplatesWithOccasion();

  const templateId = effectiveTemplateId ?? firstTemplateId;

  if (!templateId) {
    console.log('\n⚠️  No template ID available — skipping order tests.');
    console.log('    Set PARTNER_API_TEST_TEMPLATE_ID or ensure templates exist in DB.');
  } else {
    // Orders
    const created = await testCreateOrder(templateId);
    await testCreateOrderValidation(templateId);
    await testSandboxSimulateFailure(templateId);
    await testListOrders();

    if (created?.orderId) {
      await testGetOrderDetail(created.orderId);
    }
    await testOrderNotFound();
  }

  // Webhook signing (pure local, no server needed)
  testWebhookSigning();

  // ─── Summary ──────────────────────────────────────────────────────
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  console.log(`  ✅ Passed : ${passed}`);
  console.log(`  ❌ Failed : ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failed) {
      console.log(`    • ${f.name}${f.message ? ` (${f.message})` : ''}`);
    }
  }
  console.log('═'.repeat(60));

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
