/**
 * customer_templated_song — integration smoke
 *
 * 1. Create order via Partner API (product_type: customer_templated_song)
 * 2. POST /api/vendor-order/{orderToken}/generate-template
 * 3. Poll GET /api/vendor-order/{orderToken} until completed/failed or timeout
 * 4. (Optional) T2: POST generate-template for customer_custom_song token → 400
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-customer-templated-vendor-order.ts dotenv_config_path=.env.local
 *
 * Prerequisites:
 *   - App running: npm run dev
 *   - PARTNER_API_TEST_KEY — sandbox mel_pk_...
 *   - PARTNER_API_TEST_TEMPLATE_ID — active template id
 */

export {};

const BASE_URL = process.env.PARTNER_API_BASE_URL ?? 'http://127.0.0.1:3000';
const API_KEY = process.env.PARTNER_API_TEST_KEY ?? '';
const TEMPLATE_ID = parseInt(process.env.PARTNER_API_TEST_TEMPLATE_ID ?? '0', 10);

const POLL_MS = 2000;
const TIMEOUT_MS = 120_000;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  } as const;
}

async function testGenerateTemplateWrongProduct() {
  const res = await fetch(`${BASE_URL}/api/v1/partner/orders`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: JSON.stringify({
      product_type: 'customer_custom_song',
      external_order_id: `ctpl-wrong-${Date.now()}`,
    }),
  });
  const data = (await res.json()) as { order_token?: string; success?: boolean };
  if (!res.ok || !data.order_token) {
    console.log('  (skip T2) could not create customer_custom_song order', res.status, data);
    return;
  }
  const gen = await fetch(
    `${BASE_URL}/api/vendor-order/${data.order_token}/generate-template`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: TEMPLATE_ID, recipientName: 'X' }),
    },
  );
  const genJson = await gen.json();
  if (gen.status === 400 && (genJson as { error?: string }).error) {
    console.log('  T2 OK: wrong product type → 400', (genJson as { error: string }).error);
  } else {
    console.error('  T2 FAIL: expected 400, got', gen.status, genJson);
    process.exit(1);
  }
}

async function main() {
  console.log('─'.repeat(60));
  console.log('  customer_templated_song: create → generate-template → GET poll');
  console.log('─'.repeat(60));

  if (!API_KEY) {
    console.error('Missing PARTNER_API_TEST_KEY');
    process.exit(1);
  }
  if (!TEMPLATE_ID) {
    console.error('Missing PARTNER_API_TEST_TEMPLATE_ID');
    process.exit(1);
  }

  const createRes = await fetch(`${BASE_URL}/api/v1/partner/orders`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: JSON.stringify({
      product_type: 'customer_templated_song',
      external_order_id: `ctpl-${Date.now()}`,
      customer_name: 'E2E Test',
    }),
  });
  const createData = (await createRes.json()) as {
    order_id?: number;
    order_token?: string;
    success?: boolean;
  };

  if (!createRes.ok || !createData.success) {
    console.error('Create order failed', createRes.status, createData);
    process.exit(1);
  }
  const orderToken = createData.order_token;
  if (!orderToken) {
    console.error('Response missing order_token', createData);
    process.exit(1);
  }
  console.log('T1: created', { orderId: createData.order_id, orderToken });

  const genRes = await fetch(
    `${BASE_URL}/api/vendor-order/${orderToken}/generate-template`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: TEMPLATE_ID, recipientName: 'Riya' }),
    },
  );
  const genData = await genRes.json();
  if (!genRes.ok) {
    console.error('generate-template failed', genRes.status, genData);
    process.exit(1);
  }
  console.log('T1: generate-template', genRes.status);

  // T3: second generate → 409
  const second = await fetch(
    `${BASE_URL}/api/vendor-order/${orderToken}/generate-template`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: TEMPLATE_ID, recipientName: 'Riya' }),
    },
  );
  if (second.status !== 409) {
    console.error('T3 FAIL: second generate should be 409, got', second.status, await second.json());
    process.exit(1);
  }
  console.log('T3 OK: second generate → 409');

  const start = Date.now();
  for (;;) {
    const st = await fetch(`${BASE_URL}/api/vendor-order/${orderToken}`);
    const body = (await st.json()) as { order?: { status?: string } };
    if (!st.ok) {
      console.error('GET vendor-order', st.status, body);
      process.exit(1);
    }
    const s = body.order?.status;
    process.stdout.write(`\r  poll order.status=${s}    `);
    if (s === 'completed' || s === 'failed') {
      console.log('\nT1: terminal', s, 'elapsedMs', Date.now() - start);
      if (s === 'failed') process.exit(1);
      break;
    }
    if (Date.now() - start > TIMEOUT_MS) {
      console.error('\nT1: timeout waiting for completed/failed');
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  await testGenerateTemplateWrongProduct();
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
