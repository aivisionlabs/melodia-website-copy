# Melodia Analytics Setup

Complete reference for all tracking events, funnels, and GA4 dashboard configuration.

---

## Table of Contents

1. [Overview](#overview)
2. [Meta Pixel Events](#meta-pixel-events)
3. [GA4 Events Reference](#ga4-events-reference)
4. [Defined Funnels](#defined-funnels)
5. [GA4 Dashboard Setup](#ga4-dashboard-setup)

---

## Overview

| Tool | Purpose | Config |
|------|---------|--------|
| Google Analytics 4 | Full event tracking, funnels, exploration | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Meta Pixel | Ad conversion tracking (Purchase, ROAS) | `NEXT_PUBLIC_META_PIXEL_ID` |

**Implementation:** `src/lib/analytics.ts` — single source of truth for all events.
GA4 is loaded via `<GoogleAnalytics>` in `src/app/layout.tsx` and auto-fires `page_view` on every route change. Meta Pixel base code is also in `layout.tsx` and auto-fires `PageView`.

---

## Meta Pixel Events

Three standard events are fired at the most critical purchase funnel steps.

| Event | Standard Name | Fires When | Parameters |
|-------|--------------|-----------|------------|
| `addToCart` | `AddToCart` | User selects a package on `/create` | `content_name`, `value`, `currency: INR` |
| `initiateCheckout` | `InitiateCheckout` | Razorpay/Cashfree modal opens | `content_name`, `num_items: 1`, `value`, `currency: INR` |
| `purchase` | `Purchase` | Payment confirmed successfully | `content_name`, `value`, `currency: INR`, `order_id` |

> **PageView** is fired automatically by the base pixel code on every page load — no manual call needed.

### Why these events matter
- **Purchase** — the primary conversion Meta uses for campaign ROAS and cost-per-purchase reporting
- **InitiateCheckout** — enables retargeting of users who opened checkout but didn't pay
- **AddToCart** — upper-funnel intent signal used for broad audience retargeting

---

## GA4 Events Reference

All custom events flow through the `send()` primitive in `analytics.ts`, which calls `sendGAEvent()` from `@next/third-parties/google`.

### Funnel Events (`event_category: funnel`)

These are the most important events — they map to the full purchase journey.

| Event Name | `funnel_step` | Fires When | Key Parameters |
|-----------|--------------|-----------|----------------|
| `view_pricing_page` | `pricing` | Pricing page mounts | — |
| `view_item` | `pricing` | Each package rendered on pricing page | `item_name`, `price` |
| `select_item` | `pricing` | User picks a package | `item_name`, `item_id`, `price` |
| `create_plan_prefilled` | `create_request` | Create page loads with valid `?plan=` (e.g. from pricing) | `item_name`, `item_id`, `price` |
| `form_step_view` | `create_request` | Create form step becomes visible | `step_number`, `step_name` |
| `form_step_complete` | `create_request` | Create form step is completed | `step_number`, `step_name` |
| `create_input_mode_change` | `create_request` | User switches Story ↔ Lyrics input mode | `input_mode` |
| `song_request_submit` | `create_request` | Song creation form submitted | `request_id`, `package_id` |
| `lyrics_generation_start` | `lyrics` | AI lyrics generation begins | `request_id` |
| `lyrics_generation_complete` | `lyrics` | AI lyrics ready for review | `request_id`, `lyrics_version` |
| `lyrics_edit` | `lyrics` | User edits lyrics (manual or AI refine) | `request_id`, `edit_type` |
| `lyrics_approved` | `lyrics` | User approves lyrics and proceeds | `request_id`, `lyrics_version` |
| `payment_request_review_view` | `payment` | Payment review section becomes visible | `request_id` |
| `song_options_view` | `song_options` | Song options page loads with first variant ready | `song_id` |
| `song_variant_play` | `song_options` | User plays a song variant | `song_id`, `variant_index` |
| `song_variant_switch` | `song_options` | User switches between variant 0 and variant 1 | `song_id`, `from_variant`, `to_variant` |
| `song_variant_select` | `song_options` | User submits "Love it" feedback | `song_id`, `variant_index` |
| `song_variant_reject` | `song_options` | User submits "Meh" feedback | `song_id`, `variant_index`, `reason` (optional) |

### Payment Events (`event_category: payment`)

These use GA4 standard ecommerce event names for compatibility with GA4 purchase reports.

| Event Name | GA4 Standard Event | Fires When | Key Parameters |
|-----------|-------------------|-----------|----------------|
| `begin_checkout` | `begin_checkout` | Payment page loads with order details | `value`, `currency`, `items[]` |
| `add_payment_info` | `add_payment_info` | Checkout modal opened | `payment_provider`, `value`, `currency` |
| `purchase` | `purchase` | Payment confirmed | `transaction_id`, `value`, `currency`, `items[]` |
| `payment_failed` | custom | Payment fails | `error_message`, `value` |
| `payment_cancelled` | custom | User closes checkout | `value` |

### Player Events (`event_category: player`)

| Event Name | Fires When | Key Parameters |
|-----------|-----------|----------------|
| `play` | Song play begins | `song_title`, `song_id`, `source`, `section` (homepage rows), `is_demo` |
| `pause` | Song paused | `song_title`, `song_id`, `current_time` |
| `seek` | User scrubs audio | `from_time`, `to_time`, `seek_difference` |
| `audio_end` | Song plays to completion | `song_title`, `song_id`, `total_duration` |
| `audio_error` | Audio fails to load | `error_type` |

### CTA Events (`event_category: cta`)

| Event Name | Fires When | `cta_name` Values |
|-----------|-----------|------------------|
| `cta_click` | CTA button/link clicked | `hero_how_it_works`, `hero_pricing`, `how_it_works_know_more`, `how_it_works_see_pricing`, `how_it_works_select_<planId>`, `create_song_cta`, `view_lyrics` |
| `cta_impression` | CTA comes into viewport | `create_song_cta` |
| `whatsapp_contact` | WhatsApp button clicked | source: `floating_icon`, `floating_cta` |

### Engagement Events (`event_category: engagement`)

| Event Name | Fires When |
|-----------|-----------|
| `share` | Song shared via native share | `song_id`, `share_method` |
| `copy_link` | Song link copied | `song_id` |
| `download` | Song downloaded | `song_id`, `song_title` |
| `library_category_filter` | Category filter applied in library | `category` |

### Search Events (`event_category: search`)

| Event Name | Fires When |
|-----------|-----------|
| `search` | Search query submitted | `query`, `results_count`, `search_type` |
| `search_no_results` | Search returns 0 results | `query` |

### Navigation Events (`event_category: navigation`)

| Event Name | Fires When |
|-----------|-----------|
| `nav_click` | Nav link or "See All" link clicked | `element_name`, `page_url` |
| `click_occasion` | Occasion card clicked | `occasion_label`, `occasion_slug`, `source` |

### Auth Events (`event_category: auth`)

| Event Name | Fires When |
|-----------|-----------|
| `login_view` | Login page shown | `source` |
| `login_attempt` | User submits login | `method` |
| `login_success` | Login succeeds | `method` |
| `sign_up_success` | New account created | `method` |
| `logout` | User logs out | `source` |

### Other Events

| Event Name | Category | Fires When |
|-----------|---------|-----------|
| `partner_visit` | `partner` | UTM-tagged session begins |
| `llm_referral` | `llm_traffic` | User referred from ChatGPT, Perplexity, Claude, etc. |
| `my_songs_nudge_impression` | `navigation` | "My Songs" nudge banner shown |
| `my_songs_nudge_click` | `navigation` | User clicks "My Songs" nudge |
| `video_start` / `video_progress` / `video_complete` | `video` | How-it-works video engagement |

---

## Defined Funnels

### Funnel 1: Primary Purchase Funnel

The core end-to-end conversion path.

```
view_pricing_page / select_item (on /create)
        ↓
form_step_view → form_step_complete
        ↓
song_request_submit
        ↓
lyrics_generation_start → lyrics_generation_complete
        ↓
lyrics_approved
        ↓
begin_checkout (payment_request_review_view)
        ↓
add_payment_info (checkout modal opens)
        ↓
purchase ✓
```

**Drop-off indicators:**
- `lyrics_generation_complete` → `lyrics_approved` gap = users abandoning lyrics review
- `begin_checkout` → `add_payment_info` gap = users not clicking "Pay"
- `add_payment_info` → `purchase` gap = payment failures / cart abandonment

---

### Funnel 2: Song Options Funnel

Post-purchase song quality acceptance funnel.

```
song_options_view
        ↓
song_variant_play (variant 0 or 1)
        ↓
[song_variant_switch] (optional — comparing variants)
        ↓
song_variant_select ✓   OR   song_variant_reject (with reason)
```

**Key metric:** `song_variant_reject` rate per `song_id` surfaces quality issues early.

---

### Funnel 3: Occasion Discovery → Create

Top-of-funnel discovery path.

```
click_occasion (home_occasion_row)
        ↓
view_occasion (occasion page)
        ↓
cta_click: create_song_cta
        ↓
select_item (package selected)
        ↓
→ enters Primary Purchase Funnel
```

---

### Funnel 4: Library → Create

User discovers library, gets inspired, and creates.

```
play (source: library)
        ↓
library_category_filter
        ↓
use_song_template  OR  cta_click: create_song_cta
        ↓
→ enters Primary Purchase Funnel
```

---

### Funnel 5: How-It-Works → Create

Educational page conversion.

```
cta_click: how_it_works_know_more  (from homepage)
        ↓
cta_click: how_it_works_select_<planId>  OR  how_it_works_see_pricing
        ↓
select_item
        ↓
→ enters Primary Purchase Funnel
```

---

## GA4 Dashboard Setup

### Step 1: Register Custom Event Parameters as Custom Dimensions

GA4 does not report custom event parameters by default — you must register them first.

**Admin → Property → Custom definitions → Custom dimensions → Create**

Register these dimensions:

| Dimension Name | Scope | Event Parameter | Used In |
|---------------|-------|----------------|---------|
| Funnel Step | Event | `funnel_step` | All funnel reports |
| Song ID | Event | `song_id` | Song options, player reports |
| Request ID | Event | `request_id` | Lyrics, payment reports |
| Package Name | Event | `item_name` | Pricing, payment reports |
| Edit Type | Event | `edit_type` | Lyrics editing analysis |
| Rejection Reason | Event | `reason` | Song quality reports |
| CTA Name | Event | `cta_name` | CTA performance reports |
| Source | Event | `source` | Attribution reports |
| Section | Event | `section` | Homepage row analysis |
| Variant Index | Event | `variant_index` | Song options reports |
| Payment Provider | Event | `payment_provider` | Payment ops reports |
| LLM Source | Event | `llm_source` | AI traffic reports |

> **Note:** GA4 allows 50 custom dimensions per property on the free tier.

---

### Step 2: Mark `purchase` as a Conversion

**Admin → Property → Conversions → New conversion event**

Mark these as conversions:

| Event | Why |
|-------|-----|
| `purchase` | Primary revenue conversion |
| `song_request_submit` | Lead / intent captured |
| `lyrics_approved` | Mid-funnel quality signal |

---

### Step 3: Set Up Funnel Explorations

Navigate to **Explore → Funnel exploration → Create new**

#### Funnel A: Primary Purchase Funnel

Name: `Purchase Funnel - Full`

| Step | Event | Condition |
|------|-------|-----------|
| 1 | `view_pricing_page` OR `select_item` | Any |
| 2 | `form_step_complete` | `step_name = create_page` |
| 3 | `song_request_submit` | Any |
| 4 | `lyrics_approved` | Any |
| 5 | `begin_checkout` | Any |
| 6 | `add_payment_info` | Any |
| 7 | `purchase` | Any |

Settings: **Open funnel** (users can enter at any step), window = 30 days.

Breakdown dimension: `device_category` to compare mobile vs desktop drop-off.

---

#### Funnel B: Create Form Funnel

Name: `Create Form Completion`

| Step | Event | Condition |
|------|-------|-----------|
| 1 | `form_step_view` | `step_number = 1` |
| 2 | `select_item` | `funnel_step = pricing` |
| 3 | `form_step_complete` | `step_number = 1` |
| 4 | `song_request_submit` | Any |

Breakdown dimension: `input_mode` (story vs lyrics — which converts better).

---

#### Funnel C: Lyrics Review Funnel

Name: `Lyrics Review to Approval`

| Step | Event |
|------|-------|
| 1 | `lyrics_generation_start` |
| 2 | `lyrics_generation_complete` |
| 3 | `lyrics_approved` |

Breakdown dimension: `edit_type` to see if users who edited lyrics convert better.

---

#### Funnel D: Song Options Acceptance

Name: `Song Variant Acceptance`

| Step | Event |
|------|-------|
| 1 | `song_options_view` |
| 2 | `song_variant_play` |
| 3 | `song_variant_select` |

Track `song_variant_reject` as a separate event outside the funnel to measure rejection rate.

---

### Step 4: Build Key Reports in Explore

#### Report A: Song Quality Dashboard

**Free-form exploration**

Rows: `song_id`
Columns: `event_name`
Values: Event count

Filter: `event_name` contains `song_variant` (captures play, select, reject, switch)

Use this to find song IDs with high reject rates.

---

#### Report B: Homepage Row Performance

**Free-form exploration**

Filter: `event_name = play` AND `source = homepage`

Rows: `section` (custom dimension — shows which category row)
Columns: `event_name`
Values: Event count

Identifies which song categories drive the most engagement.

---

#### Report C: CTA Performance

**Free-form exploration**

Filter: `event_name = cta_click`

Rows: `cta_name`
Values: Event count

Sort descending to see which CTAs drive the most clicks.

---

#### Report D: Payment Drop-off Analysis

**Free-form exploration**

Filter: `event_name` in `[begin_checkout, add_payment_info, purchase, payment_failed, payment_cancelled]`

Rows: `event_name`
Values: Event count, Users

Shows where in the payment step users are dropping off.

---

### Step 5: Set Up Audiences for Remarketing

**Admin → Audiences → New audience**

| Audience | Condition | Use |
|----------|-----------|-----|
| Abandoned Checkout | Fired `add_payment_info` but NOT `purchase` in last 7 days | High-intent retargeting |
| Lyrics Abandoners | Fired `lyrics_generation_complete` but NOT `lyrics_approved` in last 7 days | Mid-funnel recovery |
| Song Selector Abandoners | Fired `song_options_view` but NOT `song_variant_select` in last 14 days | Post-generation recovery |
| Purchasers | Fired `purchase` | Lookalike audience seed for Meta ads |
| Song Request Submitted | Fired `song_request_submit` | Lead list |

> These audiences automatically sync to Google Ads if the account is linked.

---

### Step 6: Connect to Meta Pixel (Events Manager)

1. Open **Meta Business Suite → Events Manager → Your Pixel**
2. Verify the pixel is receiving events: check for `PageView`, `AddToCart`, `InitiateCheckout`, `Purchase`
3. Under **Aggregated Event Measurement**, prioritize events in order:
   - Priority 1: `Purchase` (highest value)
   - Priority 2: `InitiateCheckout`
   - Priority 3: `AddToCart`
4. For ad campaigns using **Purchase optimization**, set the pixel event to `Purchase`

---

### Step 7: Link GA4 to Google Ads (Optional)

**Admin → Property → Google Ads Links → Link**

This allows:
- Importing GA4 conversions (`purchase`, `song_request_submit`) into Google Ads
- Using GA4 audiences for Google Ads targeting
- Smart Bidding using GA4 conversion data

---

## Environment Variables

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX   # GA4 Measurement ID
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXX  # Meta Pixel ID
```
