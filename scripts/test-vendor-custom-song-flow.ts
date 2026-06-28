/**
 * customer_custom_song — vendor flow integration smoke test
 *
 * Exercises the full co-branded custom song path end-to-end:
 *   1. Create order via Partner API (product_type: customer_custom_song)
 *   2. GET /api/vendor-order/{token}         → pending state + vendor info
 *   3. POST /api/vendor-order/{token}/submit → form submission triggers async lyrics gen
 *   4. Poll GET until order.status = lyrics_ready_for_review
 *   5. POST /api/vendor-order/{token}/revise-lyrics → triggers async revision
 *   6. Poll GET until order.status = lyrics_ready_for_review again (new draft version)
 *   7. GET /api/vendor-order/{token}         → lyrics_drafts has ≥2 versions
 *   8. POST /api/vendor-order/{token}/approve-lyrics → triggers async song generation
 *   9. Poll GET until order.status = completed | failed
 *
 * Guard tests (run inline):
 *   G1. POST submit on already-submitted order → 409
 *   G2. POST approve-lyrics on wrong status   → 409
 *   G3. POST revise-lyrics with empty text    → 400
 *   G4. GET vendor-order for unknown token    → 404
 *   G5. POST generate-template on custom_song → 400 (wrong product type)
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-vendor-custom-song-flow.ts dotenv_config_path=.env.local
 *
 * Prerequisites:
 *   - App running: npm run dev  (with DEMO_MODE=true in .env.local for fast Suno sim)
 *   - PARTNER_API_TEST_KEY — sandbox mel_pk_... key
 *
 * Optional env vars:
 *   PARTNER_API_BASE_URL        – defaults to http://127.0.0.1:3000
 *   PARTNER_API_TEST_TEMPLATE_ID – used for G5 guard test only
 */

export {};

const BASE_URL = process.env.PARTNER_API_BASE_URL ?? 'http://127.0.0.1:3000';
const API_KEY = process.env.PARTNER_API_TEST_KEY ?? '';
const TEMPLATE_ID = parseInt(process.env.PARTNER_API_TEST_TEMPLATE_ID ?? '0', 10);

const POLL_MS = 2_000;
const LYRICS_TIMEOUT_MS = 120_000; // LLM lyrics generation can take ~30-60s
const SONG_TIMEOUT_MS = 60_000;    // Demo mode completes in ~10s; real Suno takes longer

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}
const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string): boolean {
  results.push({ name, passed: condition, detail });
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? `  (${detail})` : ''}`);
  return condition;
}

function section(title: string) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  } as const;
}

async function apiFetch(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function poll(
  orderToken: string,
  targetStatuses: string[],
  timeoutMs: number,
  label: string,
): Promise<string | null> {
  const start = Date.now();
  for (;;) {
    const { status, data } = await apiFetch('GET', `/api/vendor-order/${orderToken}`);
    if (status !== 200) {
      console.error(`  poll failed: GET returned ${status}`, data);
      return null;
    }
    const s: string = data?.order?.status ?? '';
    process.stdout.write(`\r  [${label}] order.status=${s.padEnd(40)}`);
    if (targetStatuses.includes(s)) {
      console.log(`\n  → reached "${s}" in ${Date.now() - start}ms`);
      return s;
    }
    if (s === 'failed') {
      console.log(`\n  → order failed`);
      return 'failed';
    }
    if (Date.now() - start > timeoutMs) {
      console.log(`\n  → timeout waiting for ${targetStatuses.join('|')}`);
      return null;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// ─── Main flow ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(64));
  console.log('  Melodia — customer_custom_song vendor flow smoke test');
  console.log('═'.repeat(64));
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  API Key  : ${API_KEY ? API_KEY.slice(0, 12) + '...' : '⚠️  NOT SET'}`);

  if (!API_KEY) {
    console.error('\n❌ PARTNER_API_TEST_KEY is required. Aborting.');
    process.exit(1);
  }

  // ── Step 1: Create order ──────────────────────────────────────────────────
  section('Step 1: Create customer_custom_song order');

  const createRes = await fetch(`${BASE_URL}/api/v1/partner/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      product_type: 'customer_custom_song',
      external_order_id: `ccs-flow-${Date.now()}`,
      customer_name: 'Priya',
      occasion: 'birthday',
    }),
  });
  const createData = await createRes.json() as any;

  assert('Create order → 200', createRes.status === 200, `got ${createRes.status}`);
  assert('Response has success: true', createData?.success === true);
  assert('Response has order_id', typeof createData?.order_id === 'number');
  assert('Response has order_token', typeof createData?.order_token === 'string');
  assert('Response has customer_link', typeof createData?.customer_link === 'string');

  if (!createData?.order_token) {
    console.error('\n❌ No order_token in create response — aborting.');
    process.exit(1);
  }

  const orderToken = createData.order_token as string;
  const orderId = createData.order_id as number;
  console.log(`  order_id=${orderId}  token=${orderToken}`);

  // ── Step 2: GET vendor-order — pending state ──────────────────────────────
  section('Step 2: GET vendor-order → pending state');

  const getRes = await apiFetch('GET', `/api/vendor-order/${orderToken}`);
  assert('GET vendor-order → 200', getRes.status === 200, `got ${getRes.status}`);
  assert('order.status = pending', getRes.data?.order?.status === 'pending');
  assert('vendor.slug present', typeof getRes.data?.vendor?.slug === 'string');
  assert('order.product_type = customer_custom_song', getRes.data?.order?.product_type === 'customer_custom_song');
  assert('song_request is null before submit', getRes.data?.song_request === null);
  assert('lyrics_drafts is empty before submit', Array.isArray(getRes.data?.lyrics_drafts) && getRes.data.lyrics_drafts.length === 0);

  // ── Step 3: Submit form ───────────────────────────────────────────────────
  section('Step 3: POST submit — form submission');

  const submitRes = await apiFetch('POST', `/api/vendor-order/${orderToken}/submit`, {
    recipientDetails: 'My best friend Priya who loves Bollywood and dancing',
    occasion: 'birthday',
    languages: 'Hindi',
    mood: ['happy', 'romantic'],
    story: 'We met in college and she has always been there for me through thick and thin.',
    requesterName: 'Riya',
    email: 'riya@example.com',
  });
  assert('POST submit → 200', submitRes.status === 200, `got ${submitRes.status}`);
  assert('submit response has success: true', submitRes.data?.success === true);
  assert('submit response has song_request_id', typeof submitRes.data?.song_request_id === 'number');

  // ── G1: Double-submit guard ───────────────────────────────────────────────
  const g1 = await apiFetch('POST', `/api/vendor-order/${orderToken}/submit`, {
    recipientDetails: 'Again',
    languages: 'Hindi',
  });
  assert('G1: second submit → 409', g1.status === 409, `got ${g1.status}`);

  // ── G2: approve-lyrics on wrong status (still form_submitted/lyrics_gen) ──
  // At this point status is form_submitted or lyrics_generation_inprogress, not lyrics_ready_for_review
  const g2 = await apiFetch('POST', `/api/vendor-order/${orderToken}/approve-lyrics`, {
    lyricsDraftId: 999,
  });
  assert('G2: approve-lyrics before lyrics_ready_for_review → 409', g2.status === 409, `got ${g2.status}`);

  // ── G3: revise-lyrics with empty refineText ───────────────────────────────
  const g3 = await apiFetch('POST', `/api/vendor-order/${orderToken}/revise-lyrics`, {
    refineText: '',
  });
  assert('G3: revise-lyrics with empty text → 400', g3.status === 400, `got ${g3.status}`);

  // ── G4: unknown token ────────────────────────────────────────────────────
  const g4 = await apiFetch('GET', '/api/vendor-order/tok_does_not_exist_xxxxxxxxxx');
  assert('G4: unknown token → 404', g4.status === 404, `got ${g4.status}`);

  // ── G5: generate-template on customer_custom_song ────────────────────────
  if (TEMPLATE_ID > 0) {
    const g5 = await apiFetch('POST', `/api/vendor-order/${orderToken}/generate-template`, {
      templateId: TEMPLATE_ID,
      recipientName: 'X',
    });
    assert('G5: generate-template on custom_song → 400', g5.status === 400, `got ${g5.status}`);
  } else {
    console.log('  G5: skip (PARTNER_API_TEST_TEMPLATE_ID not set)');
  }

  // ── Step 4: Poll until lyrics_ready_for_review ───────────────────────────
  section('Step 4: Poll → lyrics_ready_for_review');

  const lyricsStatus = await poll(orderToken, ['lyrics_ready_for_review'], LYRICS_TIMEOUT_MS, 'lyrics');
  assert('Reached lyrics_ready_for_review', lyricsStatus === 'lyrics_ready_for_review', `got ${lyricsStatus}`);

  if (lyricsStatus !== 'lyrics_ready_for_review') {
    console.error('\n❌ Could not reach lyrics_ready_for_review — aborting.');
    summarize();
    process.exit(1);
  }

  // Fetch state to get the draft id
  const lyricsState = await apiFetch('GET', `/api/vendor-order/${orderToken}`);
  const drafts: any[] = lyricsState.data?.lyrics_drafts ?? [];
  assert('Has at least one lyrics draft', drafts.length >= 1);
  assert('First draft has id', typeof drafts[0]?.id === 'number');
  assert('First draft has customer_lyrics', typeof drafts[0]?.customer_lyrics === 'string');
  assert('First draft has song_title', typeof drafts[0]?.song_title === 'string');

  const draftId: number = drafts[0]?.id;

  // ── Step 5: Revise lyrics ─────────────────────────────────────────────────
  section('Step 5: POST revise-lyrics');

  const reviseRes = await apiFetch('POST', `/api/vendor-order/${orderToken}/revise-lyrics`, {
    refineText: 'Make it more upbeat and mention that she loves cricket',
  });
  assert('POST revise-lyrics → 200', reviseRes.status === 200, `got ${reviseRes.status}`);
  assert('revise response has success: true', reviseRes.data?.success === true);

  // ── Step 6: Poll until lyrics_ready_for_review (revision complete) ────────
  section('Step 6: Poll → lyrics_ready_for_review (after revision)');

  const reviseStatus = await poll(
    orderToken,
    ['lyrics_ready_for_review'],
    LYRICS_TIMEOUT_MS,
    'revise',
  );
  assert('Reached lyrics_ready_for_review after revision', reviseStatus === 'lyrics_ready_for_review', `got ${reviseStatus}`);

  if (reviseStatus !== 'lyrics_ready_for_review') {
    console.error('\n❌ Revision did not complete — aborting.');
    summarize();
    process.exit(1);
  }

  // ── Step 7: Verify second draft version exists ────────────────────────────
  section('Step 7: Verify revision created a new draft version');

  const revisedState = await apiFetch('GET', `/api/vendor-order/${orderToken}`);
  const revisedDrafts: any[] = revisedState.data?.lyrics_drafts ?? [];
  assert('Has ≥2 draft versions after revision', revisedDrafts.length >= 2, `got ${revisedDrafts.length}`);
  if (revisedDrafts.length >= 2) {
    assert(
      'Newest draft has higher version',
      revisedDrafts[0]?.version > revisedDrafts[1]?.version,
      `v${revisedDrafts[0]?.version} vs v${revisedDrafts[1]?.version}`,
    );
  }

  // Use the newest (first returned) draft for approval
  const approveDraftId: number = revisedDrafts[0]?.id ?? draftId;

  // ── Step 8: Approve lyrics ────────────────────────────────────────────────
  section('Step 8: POST approve-lyrics');

  const approveRes = await apiFetch('POST', `/api/vendor-order/${orderToken}/approve-lyrics`, {
    lyricsDraftId: approveDraftId,
  });
  assert('POST approve-lyrics → 200', approveRes.status === 200, `got ${approveRes.status}`);
  assert('approve response has success: true', approveRes.data?.success === true);

  // Second approval attempt (order now in song_generation_inprogress) should 409
  const approveAgain = await apiFetch('POST', `/api/vendor-order/${orderToken}/approve-lyrics`, {
    lyricsDraftId: approveDraftId,
  });
  assert('Second approve-lyrics → 409', approveAgain.status === 409, `got ${approveAgain.status}`);

  // ── Step 9: Poll until completed/failed ──────────────────────────────────
  section('Step 9: Poll → completed (song generation)');
  console.log('  (tip: set DEMO_MODE=true in .env.local for fast completion ~10s)');

  const finalStatus = await poll(
    orderToken,
    ['completed', 'failed'],
    SONG_TIMEOUT_MS,
    'song',
  );
  assert(
    'Order reached terminal status',
    finalStatus === 'completed' || finalStatus === 'failed',
    `got ${finalStatus}`,
  );

  if (finalStatus === 'completed') {
    const finalState = await apiFetch('GET', `/api/vendor-order/${orderToken}`);
    const userSong = finalState.data?.user_song;
    assert('Completed order has user_song', userSong != null);
    assert('user_song has slug', typeof userSong?.slug === 'string');
    assert('user_song has song_variants', userSong?.song_variants != null);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  summarize();
  process.exit(results.filter((r) => !r.passed).length > 0 ? 1 : 0);
}

function summarize() {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  console.log('\n' + '═'.repeat(64));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(64));
  console.log(`  ✅ Passed : ${passed}`);
  console.log(`  ❌ Failed : ${failed.length}`);
  if (failed.length > 0) {
    console.log('\n  Failed:');
    for (const f of failed) {
      console.log(`    • ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
    }
  }
  console.log('═'.repeat(64));
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
