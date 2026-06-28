/**
 * Vendor API – Token Flow Smoke Test
 *
 * Verifies the canonical unified flow contract:
 *   1. Create order via Partner API (customer_custom_song)
 *   2. Confirm response includes order_token + customer_link
 *   3. Fetch order detail and verify token/customer_link contract
 *   4. Verify hosted customer page is reachable
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/simulate-vendor-flow.ts dotenv_config_path=.env.local
 *
 * Prerequisites:
 *   - Server running on localhost:3000 (npm run dev)
 *   - PARTNER_API_TEST_KEY – sandbox or production vendor API key (mel_pk_...)
 */

export {};

const BASE_URL = process.env.PARTNER_API_BASE_URL ?? 'http://localhost:3000';
const API_KEY = process.env.PARTNER_API_TEST_KEY ?? '';
const CUSTOMER_NAME = process.env.PARTNER_API_TEST_CUSTOMER_NAME ?? 'Priya';
const OCCASION = process.env.PARTNER_API_TEST_OCCASION ?? 'birthday';

// ─── Helpers ──────────────────────────────────────────────────────────

function log(step: string, msg: string, data?: unknown) {
  const prefix = `[${step}]`.padEnd(18);
  console.log(`${prefix} ${msg}`);
  if (data !== undefined) {
    console.log(' '.repeat(20) + JSON.stringify(data, null, 2).replace(/\n/g, '\n' + ' '.repeat(20)));
  }
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
}

async function apiFetch(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// ─── Steps ────────────────────────────────────────────────────────────

async function step1_createOrder(): Promise<{ orderId: number; orderToken: string; customerLink: string }> {
  console.log('\n─── Step 1: Create Order ───────────────────────────────────');

  const externalId = `sim-${Date.now()}`;
  const { status, data } = await apiFetch('POST', '/api/v1/partner/orders', {
    product_type: 'customer_custom_song',
    external_order_id: externalId,
    customer_name: CUSTOMER_NAME,
    occasion: OCCASION,
  });

  if (status !== 200 || !data?.success) {
    fail(`Order creation failed (${status}): ${JSON.stringify(data?.error ?? data)}`);
    process.exit(1);
  }

  pass(`Order created — ID: ${data.order_id}, status: ${data.status}`);
  if (!data.order_token || !data.customer_link) {
    fail('Create response is missing order_token/customer_link');
    process.exit(1);
  }
  pass(`Order token: ${data.order_token}`);
  pass(`Customer link: ${data.customer_link}`);
  log('order', 'Response', {
    order_id: data.order_id,
    status: data.status,
    order_token: data.order_token,
    customer_link: data.customer_link,
  });

  return {
    orderId: data.order_id,
    orderToken: data.order_token,
    customerLink: data.customer_link,
  };
}

async function step2_verifyOrderDetail(
  orderId: number,
  expectedOrderToken: string,
  expectedCustomerLink: string,
): Promise<void> {
  console.log('\n─── Step 2: Verify Order Detail Contract ───────────────────');
  const { status, data } = await apiFetch('GET', `/api/v1/partner/orders/${orderId}`);
  if (status !== 200) {
    fail(`Could not fetch order detail (${status}): ${JSON.stringify(data)}`);
    process.exit(1);
  }
  if (data.order_token !== expectedOrderToken) {
    fail(`Expected order_token=${expectedOrderToken}, got ${data.order_token}`);
    process.exit(1);
  }
  if (data.customer_link !== expectedCustomerLink) {
    fail(`Expected customer_link=${expectedCustomerLink}, got ${data.customer_link}`);
    process.exit(1);
  }
  pass(`Order detail includes matching order_token/customer_link`);
}

async function step3_verifyCustomerPage(customerLink: string): Promise<void> {
  console.log('\n─── Step 3: Verify Customer Hosted Page ────────────────────');
  try {
    const res = await fetch(customerLink, { headers: { Accept: 'text/html' } });
    if (res.status === 200) {
      pass(`Customer page is accessible (${res.status})`);
    } else {
      fail(`Customer page returned ${res.status}`);
    }
  } catch {
    fail('Could not reach customer page');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Melodia Vendor API – Token Flow Smoke Test');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Base URL    : ${BASE_URL}`);
  console.log(`  API Key     : ${API_KEY ? API_KEY.slice(0, 12) + '...' : '⚠️  NOT SET'}`);
  console.log(`  Customer    : ${CUSTOMER_NAME}`);
  console.log(`  Occasion    : ${OCCASION}`);

  if (!API_KEY) {
    console.log('\n❌ PARTNER_API_TEST_KEY is required. Aborting.');
    process.exit(1);
  }
  const { orderId, orderToken, customerLink } = await step1_createOrder();
  await step2_verifyOrderDetail(orderId, orderToken, customerLink);
  await step3_verifyCustomerPage(customerLink);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Simulation complete');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
