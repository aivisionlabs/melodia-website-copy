# Graphify vs Traditional Tool Search — Token Efficiency Benchmarks

Graph: **3,608 nodes · 8,776 edges · 196 communities** (melodia-website, 721 files)  
Token estimate: ~10 tokens/line of TypeScript (conservative). Graphify tokens measured from actual query output.

---

## How to read the comparison

| Column | What it measures |
|---|---|
| **Traditional approach** | Grep to discover files → Read each file to answer the question |
| **Graphify approach** | Single `graphify query` or `graphify explain` command |
| **Token cost (traditional)** | Input tokens Claude must process: grep output + full file contents |
| **Token cost (graphify)** | Graphify query response (node list + edges, budget-capped) |

---

## Test Case 1 — "How does the end-to-end song creation flow work?"

**Question:** Trace the user journey from wizard UI → API → generation service.

### Traditional approach

```bash
# Step 1: discovery
grep -rl "createSongRequest\|wizard\|WizardContext" src/ --include="*.tsx" --include="*.ts"
# → 13 files returned

# Step 2: read each file to understand the flow
Read: wizard-context.tsx            (261 lines)
Read: create-song-wizard-client.tsx (~200 lines)
Read: step-catalog.tsx              (~180 lines)
Read: step-story.tsx                (~150 lines)
Read: step-package.tsx              (~120 lines)
Read: create-song-request/route.ts  (341 lines)
Read: song-generation-service.ts    (414 lines)
                               ─────────────
                     Total read:  1,666 lines
```

**Token cost (traditional):** grep output (~300 tokens) + 1,666 lines × 10 = **~17,000 tokens**  
**Reads required:** 7 sequential tool calls (each dependent on previous to know what to open next)

### Graphify approach

```bash
graphify query "How does the end-to-end song creation flow work, \
  from UI wizard to API to generation service?" --budget 800
```

**Result:** 236 nodes found in BFS depth=2. Returns file pointers + community context.  
**Token cost (graphify):** **~800 tokens** (budget cap; returns node list, not file contents)

### Verdict

| | Traditional | Graphify |
|---|---|---|
| Tokens | ~17,000 | ~800 |
| Tool calls | 8+ (grep + 7 reads) | 1 |
| Savings | — | **~95% fewer tokens** |
| Gap | Gives you actual code | Gives you file pointers only |

**When to use graphify:** Initial orientation — "which files are involved?" Before you've narrowed down where to look.  
**When to read files:** Once graphify surfaces the 2-3 most relevant nodes, open those specifically.

---

## Test Case 2 — "What calls `generateSong()` and what does it depend on?"

**Question:** Find every caller of `generateSong()` and map its dependency chain.

### Traditional approach

```bash
# Step 1: find callers
grep -rl "generateSong\|SongGenerationService" src/ --include="*.ts"
# → 10 files

# Step 2: read to confirm actual call sites + imports
Read: payments/success/route.ts           (391 lines)
Read: vendor-order/[orderToken]/route.ts  (~220 lines)
Read: approve-lyrics/route.ts             (~150 lines)
Read: generate-song/route.ts              (~100 lines)
Read: song-generation-service.ts          (414 lines)
                                    ──────────────
                          Total read:  1,275 lines
```

**Token cost (traditional):** grep (~250 tokens) + 1,275 × 10 = **~13,000 tokens**

### Graphify approach

```bash
graphify query "SongGenerationService generateSong callers dependencies" --budget 600
```

**Result:** 114 nodes found. Surfaces `approve-lyrics/route.ts`, `vendor-order/route.ts`,  
`order-creators.ts`, `rate-limiting/middleware.ts`, `suno-api.ts` — the full call graph.

**Token cost (graphify):** **~600 tokens**

### Verdict

| | Traditional | Graphify |
|---|---|---|
| Tokens | ~13,000 | ~600 |
| Tool calls | 6+ | 1 |
| Savings | — | **~95% fewer tokens** |
| Gap | See actual call arguments | Node names + community only |

**Optimization:** Use graphify to get the caller list (~600 tokens), then Read only the 1-2 ambiguous files. Net cost: ~1,500 tokens vs 13,000.

---

## Test Case 3 — "How does the payment flow work?"

**Question:** Map all files in the payment pipeline — types, UI, API routes, callbacks.

### Traditional approach

```bash
# Step 1
grep -rl "payment\|razorpay\|PaymentProvider" src/ --include="*.ts" --include="*.tsx"
# → 15+ files; hard to know which 5 matter

# Step 2: read core files
Read: types/payment.ts                  (~80 lines)
Read: payment/page.tsx                  (~350 lines)
Read: payments/success/route.ts         (391 lines)
Read: payments/create-order/route.ts    (~180 lines)
Read: song-generation-service.ts        (414 lines)  ← called after payment
                                   ──────────────
                         Total read:  1,415 lines
```

**Token cost (traditional):** grep (~400 tokens) + 1,415 × 10 = **~14,500 tokens**

### Graphify approach

```bash
graphify query "How does the payment flow work and which files are involved?" --budget 800
```

**Result:** 119 nodes found. Immediately surfaces `use-payment-checkout.ts`,  
`ApprovalConfirmDialog.tsx`, `PaymentResponse`, `trackPaymentEvent` — nodes  
traditional grep on "payment" string would miss (grep finds the string, graphify finds the concept).

**Token cost (graphify):** **~800 tokens**

### Verdict

| | Traditional | Graphify |
|---|---|---|
| Tokens | ~14,500 | ~800 |
| Tool calls | 6+ | 1 |
| Savings | — | **~94% fewer tokens** |
| Gap | Grep misses semantic neighbors | Graph surfaces `use-payment-checkout.ts` without needing the right keyword |

**Key insight:** Graphify finds semantic neighbors (hooks, analytics events, dialog components)  
that grep-by-string misses entirely. This is its strongest advantage over `grep`.

---

## Test Case 4 — "Which files handle rate limiting and what config controls it?" ⚠️ Failure Case

**Question:** Find `rate-limiting/config.ts`, `middleware.ts`, and which API routes use them.

### Traditional approach

```bash
# Step 1
find src/lib/rate-limiting -name "*.ts"
# → config.ts, middleware.ts, redis.ts  (instant, ~50 tokens)

# Step 2: read them
Read: rate-limiting/config.ts    (111 lines)
Read: rate-limiting/middleware.ts (~90 lines)
Read: rate-limiting/redis.ts      (~60 lines)
                            ──────────────
                  Total read:    261 lines
```

**Token cost (traditional):** `find` (~50 tokens) + 261 × 10 = **~2,660 tokens**

### Graphify approach

```bash
graphify query "rate limiting middleware config which routes are protected" --budget 600
```

**Result (WRONG):** 6 nodes found — returns `proxy.ts` and `logger/index.ts` config nodes,  
**not** `rate-limiting/config.ts`. The word "config" matched generic config nodes.

```bash
# Fallback: try path command
graphify path "rate-limiting/config.ts" "middleware.ts"
# → "No path found between..."  (path lookup by short filename failed)
```

**Token cost (graphify):** ~300 tokens, but the answer was **incorrect**.

### Verdict

| | Traditional | Graphify |
|---|---|---|
| Tokens | ~2,660 | ~300 (wrong answer) |
| Tool calls | 1 find + 3 reads | 1 (failed) |
| Winner | **Traditional** | ✗ Failed |

**Root cause:** The graph indexed `config` as a generic node. Short filenames in the  
same-named `config` key collide. Graphify's BFS starts from ambiguous anchors.

**Rule:** For well-scoped, file-path-known lookups (`find`, `ls`, known symbol names),  
traditional tools are faster AND cheaper than graphify. Use graphify for **unknown topology** questions.

---

## Test Case 5 — "How does LLM lyrics generation work, from prompt builder to audio model?"

**Question:** Trace the multi-file pipeline: context analysis → prompt builder → LLM crafter → shared LLM layer.

### Traditional approach

```bash
# Step 1: find LLM files
find src/lib/services/llm -name "*.ts"
# → 6 files; but which order do they call each other?

# Step 2: read to trace the call chain
Read: llm-audio-model-lyrics-crafter.ts           (147 lines)
Read: prompts/audio-model-lyrics-crafter-prompt-builder.ts  (74 lines)
Read: llm-shared.ts                               (~300 lines)
Read: llm-lyrics-operation.ts                     (~250 lines)
Read: llm-context-analysis.ts                     (~180 lines)
                                             ──────────────
                                   Total read:    951 lines
# Step 3: re-read pieces when call chain is unclear — likely 2 more reads
```

**Token cost (traditional):** `find` (~80 tokens) + 951 × 10 + re-reads (~2,000) = **~11,600 tokens**

### Graphify approach

```bash
graphify query "How does LLM lyrics generation work, from prompt builder to audio model?" --budget 800
```

**Result:** 139 nodes found. In one pass surfaces: `llm-lyrics-operation.ts`,  
`llm-shared.ts`, `generateWithVertexAI()`, `llm-context-analysis.ts`,  
`approve-lyrics/route.ts`, `templated-song-generation-service.ts`, `suno-api.ts` —  
the full pipeline including the **Vertex AI backend** and **Suno integration** that  
a `find src/lib/services/llm` alone would miss.

**Token cost (graphify):** **~800 tokens**

### Verdict

| | Traditional | Graphify |
|---|---|---|
| Tokens | ~11,600 | ~800 |
| Tool calls | 7+ (find + 5 reads + re-reads) | 1 |
| Savings | — | **~93% fewer tokens** |
| Gap | You'd miss Vertex AI + Suno links | Captures cross-service edges |

**Key insight:** This is graphify's ideal scenario — a multi-file pipeline where  
the edges between files matter more than any single file's content.

---

## Summary Table

| # | Question type | Traditional tokens | Graphify tokens | Savings | Graphify wins? |
|---|---|---|---|---|---|
| 1 | Flow trace (wizard → API → service) | ~17,000 | ~800 | 95% | ✅ Yes |
| 2 | Caller/dependency mapping | ~13,000 | ~600 | 95% | ✅ Yes |
| 3 | Semantic concept (payment "flow") | ~14,500 | ~800 | 94% | ✅ Yes (+ finds nodes grep misses) |
| 4 | Known file path lookup | ~2,660 | ~300 wrong | — | ❌ No — traditional wins |
| 5 | Multi-file pipeline trace | ~11,600 | ~800 | 93% | ✅ Yes (finds cross-service edges) |

---

## Optimal Token Strategy

```
IF question is "how does X work" / "what calls Y" / "which files are involved in Z"
  → graphify query first (~600–800 tokens)
  → then Read only the 1-3 files graphify surfaces as most central
  → total budget: ~2,000–5,000 tokens  (vs 10,000–17,000 cold)

IF question is "read this specific file" / "what's in rate-limiting/config.ts"
  → skip graphify, use Read or find directly
  → graphify adds overhead with no benefit when the path is already known

IF question spans community boundaries (e.g. LLM service → webhook delivery → partner API)
  → graphify is the only practical option without reading 20+ files
  → graphify --budget 1500 for wide cross-community queries
```

### Graphify failure modes to watch for

- **Generic node name collisions** — `config`, `utils`, `index` match wrong nodes
- **Short filename path lookup** — `graphify path "config.ts" "middleware.ts"` unreliable
- **Budget truncation** — 236 nodes found but only 33 shown at 800-token budget; increase `--budget` or add `context_filter`
- **No file content** — graphify returns pointers; you still need `Read` for the actual logic
