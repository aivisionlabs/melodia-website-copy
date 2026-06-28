# Melodia Webhook — Signature Verification Guide

Every webhook request sent by Melodia is signed with an **HMAC-SHA256** signature. Verifying this signature before processing the payload ensures the request genuinely came from Melodia and has not been tampered with in transit.

---

## What Melodia sends

Each webhook `POST` request includes a header:

```
X-Melodia-Webhook-Signature: sha256=<64-character hex string>
```

The signature is computed over the **exact bytes of the request body** using your `webhook_secret` as the key.

---

## How to verify — step by step

### 1. Read the raw request body

Read the body as raw bytes **before** parsing it as JSON. Once a body is parsed and re-serialized, key ordering or whitespace may change and the signature will not match.

### 2. Read the signature header

Extract the value of `X-Melodia-Webhook-Signature` from the request headers.

### 3. Compute the expected signature

Compute `HMAC-SHA256` over the raw body bytes using your `webhook_secret` as the key. Encode the result as a lowercase hex string and prepend `sha256=`.

```
expected = "sha256=" + HMAC_SHA256(key=webhook_secret, message=raw_body_bytes).hex()
```

### 4. Compare using a timing-safe function

Compare the received signature against the expected signature using a **timing-safe comparison**. See [What is a timing-safe comparison?](#what-is-a-timing-safe-comparison) below for why this matters. Always use the dedicated function your language provides — never a regular `==`.

### 5. Accept or reject

- If the signatures match → proceed to process the payload.
- If they do not match → return `HTTP 400` and discard the request. Do not process the payload.

---

## Pseudocode (language-agnostic)

```
function isValidWebhook(request, webhookSecret):
    receivedSignature = request.headers["X-Melodia-Webhook-Signature"]

    if receivedSignature is missing or empty:
        return false

    rawBody = request.rawBody  // bytes, not parsed JSON

    expectedSignature = "sha256=" + hmac_sha256_hex(
        key     = webhookSecret,
        message = rawBody
    )

    return timingSafeEqual(receivedSignature, expectedSignature)
```

---

## What is a timing-safe comparison?

A normal string comparison (`==`) works by scanning characters left to right and **stopping the moment it finds a mismatch**:

```
"sha256=abc123..." == "sha256=xyz999..."
         ^
         stops here — different on character 8, returns false immediately

"sha256=abc123...correct_end_x" == "sha256=abc123...correct_end_y"
                                                                 ^
         stops here — matches 63 characters before failing, takes longer
```

An attacker who can send many requests and measure response times can exploit this. By systematically trying different signature values and watching how long your server takes to reject them, they can guess the correct signature one character at a time — without knowing your secret. This is called a **timing attack**.

A timing-safe comparison always checks every character regardless of where the first difference is, so every comparison takes the same amount of time:

```
// Normal comparison — leaks timing information
if received == expected:        // BAD

// Timing-safe comparison — always takes the same time
if timingSafeEqual(received, expected):   // GOOD
```

**Built-in timing-safe functions by language:**

| Language | Function |
|---|---|
| Node.js | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` |
| Python | `hmac.compare_digest(a, b)` |
| PHP | `hash_equals($a, $b)` |
| Go | `subtle.ConstantTimeCompare([]byte(a), []byte(b))` |
| Ruby | `Rack::Utils.secure_compare(a, b)` |
| Java | `MessageDigest.isEqual(a.getBytes(), b.getBytes())` |

> **Note:** Most of these require both strings to be the same length. If the lengths differ, return `false` immediately — a length mismatch means the signatures cannot match, and length alone reveals nothing useful to an attacker.

---

## Rules that must be followed

| Rule | Reason |
|---|---|
| Use the **raw body bytes** to compute the signature | Parsing the JSON and re-serialising it can change key order or whitespace, which changes the signature |
| Use a **timing-safe string comparison** | A normal `==` stops at the first mismatched character, leaking information via response time — see section above |
| **Reject before processing** — check the signature first, then handle the payload | Processing an unverified payload can lead to unintended side effects |
| Store `webhook_secret` in an **environment variable**, not in source code | Treat it like a password |
| Do **not** log or expose `webhook_secret` in error messages or responses | Once leaked, any attacker can forge Melodia webhook requests |

---

## Your webhook secret

Your `webhook_secret` is provided by Melodia when your integration is set up. It is a fixed secret shared between Melodia and your endpoint — the same secret is used for all event types (`order.created`, `order.completed`, `order.failed`, etc.).

If you believe your secret has been compromised, contact Melodia to rotate it.

---

## Responding to webhooks

Your endpoint should return `HTTP 200` as quickly as possible to acknowledge receipt. If your handler performs slow operations (database writes, downstream API calls), acknowledge first and process asynchronously. Melodia considers any `2xx` response a success.

If Melodia does not receive a `2xx` response, it will retry delivery on the following schedule:

| Attempt | Delay after previous attempt |
|---|---|
| 2 | 30 seconds |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 24 hours |

After 6 attempts without a `2xx` response, no further retries are made.

---

## Quick reference

| Item | Value |
|---|---|
| Signature header | `X-Melodia-Webhook-Signature` |
| Format | `sha256=<64 hex characters>` |
| Algorithm | HMAC-SHA256 |
| Signed over | Raw request body (UTF-8 bytes) |
| Key | Your `webhook_secret` |
| Comparison method | Timing-safe / constant-time |
