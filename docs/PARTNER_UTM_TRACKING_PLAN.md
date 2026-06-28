# Partner UTM Tracking Implementation Plan

## 📋 Overview

This document outlines the implementation plan for tracking partner referrals (cake shops and Instagram influencers) through UTM parameters and QR codes. When users scan QR codes from partners, we'll track which partner they came from and measure conversion metrics.

## 🎯 Goals

1. **Track Partner Referrals**: Identify which partner (cake shop/influencer) a user came from
2. **Measure Conversions**: Track how many users from each partner create song requests
3. **Generate Partner QR Codes**: Create unique QR codes for each partner with UTM parameters
4. **Analytics Dashboard**: Provide insights on partner performance
5. **Attribution**: Link song requests and payments to specific partners

## 🏗️ Architecture Overview

### Flow Diagram
```
QR Code Scan → Landing Page (with UTM params) → Capture & Store UTM →
Create Anonymous User → Link UTM to User → Track Conversions
```

### Key Components
1. **Partners Table**: Store partner information (cake shops, influencers)
2. **UTM Tracking Table**: Store UTM parameters and link to users/sessions
3. **QR Code Generator**: Create unique QR codes with UTM parameters
4. **UTM Capture Middleware**: Capture UTM params on page load
5. **Analytics API**: Query partner performance metrics
6. **Admin Dashboard**: View partner analytics

---

## 📊 Database Schema Changes

### 1. Partners Table
Store information about cake shops and Instagram influencers.

```sql
CREATE TABLE partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cake_shop' | 'instagram_influencer'
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  instagram_handle TEXT, -- For influencers
  business_address TEXT, -- For cake shops
  active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(5, 2), -- Optional: commission percentage
  metadata JSONB, -- Additional partner-specific data
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Partner Visits/UTM Tracking Table
Track each visit with UTM parameters and link to users.

```sql
CREATE TABLE partner_visits (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id),
  anonymous_user_id UUID REFERENCES anonymous_users(id),
  user_id INTEGER REFERENCES users(id), -- Set when user signs up/authenticates
  utm_source TEXT, -- e.g., 'cake_shop', 'instagram'
  utm_medium TEXT, -- e.g., 'qr_code', 'social'
  utm_campaign TEXT, -- e.g., 'birthday_promotion'
  utm_content TEXT, -- Optional: specific content identifier
  utm_term TEXT, -- Optional: keyword
  referrer TEXT, -- HTTP referrer header
  landing_page TEXT, -- First page visited
  ip_address TEXT,
  user_agent TEXT,
  first_visit_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_visit_at TIMESTAMP NOT NULL DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  converted BOOLEAN DEFAULT false, -- True if user created song request
  song_request_id INTEGER REFERENCES song_requests(id), -- Link to conversion
  payment_id INTEGER REFERENCES payments(id), -- Link to payment if converted
  metadata JSONB -- Additional tracking data
);

CREATE INDEX idx_partner_visits_partner_id ON partner_visits(partner_id);
CREATE INDEX idx_partner_visits_anonymous_user_id ON partner_visits(anonymous_user_id);
CREATE INDEX idx_partner_visits_user_id ON partner_visits(user_id);
CREATE INDEX idx_partner_visits_converted ON partner_visits(converted);
CREATE INDEX idx_partner_visits_utm_source ON partner_visits(utm_source);
```

### 3. Update Existing Tables

Add partner tracking fields to `song_requests` table:

```sql
ALTER TABLE song_requests
ADD COLUMN partner_id INTEGER REFERENCES partners(id),
ADD COLUMN partner_visit_id INTEGER REFERENCES partner_visits(id);

CREATE INDEX idx_song_requests_partner_id ON song_requests(partner_id);
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup

#### Step 1.1: Create Migration Files
- Create migration for `partners` table
- Create migration for `partner_visits` table
- Create migration to add partner fields to `song_requests`

#### Step 1.2: Update Schema Types
- Add TypeScript types in `src/lib/db/schema.ts`
- Export types for partners and partner visits

### Phase 2: UTM Parameter Capture

#### Step 2.1: Create UTM Capture Hook
**File**: `src/hooks/use-utm-tracking.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function useUTMTracking() {
  const searchParams = useSearchParams();
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);

  useEffect(() => {
    const utm: UTMParams = {};
    const source = searchParams.get('utm_source');
    const medium = searchParams.get('utm_medium');
    const campaign = searchParams.get('utm_campaign');
    const content = searchParams.get('utm_content');
    const term = searchParams.get('utm_term');

    if (source || medium || campaign) {
      if (source) utm.utm_source = source;
      if (medium) utm.utm_medium = medium;
      if (campaign) utm.utm_campaign = campaign;
      if (content) utm.utm_content = content;
      if (term) utm.utm_term = term;

      setUtmParams(utm);

      // Store in sessionStorage for persistence across navigation
      sessionStorage.setItem('utm_params', JSON.stringify(utm));

      // Send to API to store
      trackUTMVisit(utm);
    } else {
      // Check if UTM params exist in sessionStorage (from previous visit)
      const stored = sessionStorage.getItem('utm_params');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUtmParams(parsed);
        } catch (e) {
          // Invalid stored data
        }
      }
    }
  }, [searchParams]);

  return utmParams;
}

async function trackUTMVisit(utm: UTMParams) {
  try {
    await fetch('/api/track-utm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...utm,
        referrer: document.referrer,
        landing_page: window.location.pathname,
      }),
    });
  } catch (error) {
    console.error('Failed to track UTM visit:', error);
  }
}
```

#### Step 2.2: Create UTM Tracking API
**File**: `src/app/api/track-utm/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnerVisitsTable, partnersTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAnonymousCookie } from '@/lib/auth/cookies';
import { getCurrentUser } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      landing_page,
    } = body;

    // Get user identifiers
    const user = await getCurrentUser(req);
    const anonymousId = await getAnonymousCookie();

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Find partner by UTM source (if it's a partner slug)
    let partnerId: number | null = null;
    if (utm_source) {
      const partners = await db
        .select()
        .from(partnersTable)
        .where(eq(partnersTable.slug, utm_source))
        .limit(1);

      if (partners.length > 0) {
        partnerId = partners[0].id;
      }
    }

    // Check if visit already exists for this anonymous user
    let existingVisit = null;
    if (anonymousId) {
      const visits = await db
        .select()
        .from(partnerVisitsTable)
        .where(
          and(
            eq(partnerVisitsTable.anonymous_user_id, anonymousId),
            eq(partnerVisitsTable.utm_source, utm_source || ''),
            eq(partnerVisitsTable.utm_campaign, utm_campaign || '')
          )
        )
        .limit(1);

      if (visits.length > 0) {
        existingVisit = visits[0];
      }
    }

    if (existingVisit) {
      // Update existing visit
      await db
        .update(partnerVisitsTable)
        .set({
          last_visit_at: new Date(),
          visit_count: existingVisit.visit_count + 1,
          user_id: user?.id || existingVisit.user_id,
        })
        .where(eq(partnerVisitsTable.id, existingVisit.id));

      return NextResponse.json({
        success: true,
        visit_id: existingVisit.id,
        is_new: false
      });
    } else {
      // Create new visit
      const newVisits = await db
        .insert(partnerVisitsTable)
        .values({
          partner_id: partnerId,
          anonymous_user_id: anonymousId || undefined,
          user_id: user?.id || undefined,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,
          referrer: referrer || null,
          landing_page: landing_page || null,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning();

      return NextResponse.json({
        success: true,
        visit_id: newVisits[0].id,
        is_new: true
      });
    }
  } catch (error) {
    console.error('UTM tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track UTM visit' },
      { status: 500 }
    );
  }
}
```

#### Step 2.3: Integrate UTM Tracking in Root Layout
**File**: `src/app/layout.tsx`

Add the UTM tracking hook to the root layout or create a client component wrapper.

**File**: `src/components/UTMTracking.tsx` (new)

```typescript
'use client';

import { useUTMTracking } from '@/hooks/use-utm-tracking';

export function UTMTracking() {
  useUTMTracking();
  return null; // This component doesn't render anything
}
```

Then add to `layout.tsx`:
```typescript
import { UTMTracking } from '@/components/UTMTracking';

// In the body:
<UTMTracking />
```

### Phase 3: Link Conversions to Partners

#### Step 3.1: Update Song Request Creation
**File**: `src/app/api/create-song-request/route.ts`

When creating a song request, check for UTM params and link to partner visit:

```typescript
// After getting anonymousId/userId, check for partner visit
let partnerVisitId: number | null = null;
let partnerId: number | null = null;

if (anonymousId) {
  // Get the most recent partner visit for this anonymous user
  const visits = await db
    .select()
    .from(partnerVisitsTable)
    .where(eq(partnerVisitsTable.anonymous_user_id, anonymousId))
    .orderBy(desc(partnerVisitsTable.first_visit_at))
    .limit(1);

  if (visits.length > 0) {
    partnerVisitId = visits[0].id;
    partnerId = visits[0].partner_id;

    // Mark visit as converted
    await db
      .update(partnerVisitsTable)
      .set({ converted: true })
      .where(eq(partnerVisitsTable.id, partnerVisitId));
  }
}

// When creating song request, include partner fields:
const newRequests = await db
  .insert(songRequestsTable)
  .values({
    // ... existing fields
    partner_id: partnerId,
    partner_visit_id: partnerVisitId,
  })
  .returning();
```

#### Step 3.2: Update Payment Tracking
**File**: `src/app/api/payments/verify/route.ts`

When payment is completed, update partner visit with payment_id:

```typescript
// After payment verification, update partner visit
if (payment.song_request_id) {
  const songRequest = await getSongRequestById(payment.song_request_id);
  if (songRequest?.partner_visit_id) {
    await db
      .update(partnerVisitsTable)
      .set({ payment_id: payment.id })
      .where(eq(partnerVisitsTable.id, songRequest.partner_visit_id));
  }
}
```

### Phase 4: QR Code Generation

#### Step 4.1: Create QR Code Generator API
**File**: `src/app/api/admin/partners/[partnerId]/qr-code/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode'; // npm install qrcode @types/qrcode

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;
    const partner = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, parseInt(partnerId)))
      .limit(1);

    if (partner.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://melodia-songs.com';
    const qrUrl = `${baseUrl}/?utm_source=${partner[0].slug}&utm_medium=qr_code&utm_campaign=partner_referral`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      partner_id: partner[0].id,
      partner_name: partner[0].name,
      qr_url: qrUrl,
      qr_code_image: qrCodeDataUrl,
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
```

#### Step 4.2: Create Partner Management API
**File**: `src/app/api/admin/partners/route.ts`

CRUD operations for partners:
- GET: List all partners
- POST: Create new partner
- PUT: Update partner
- DELETE: Deactivate partner

### Phase 5: Analytics & Reporting

#### Step 5.1: Create Partner Analytics API
**File**: `src/app/api/admin/partners/[partnerId]/analytics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnerVisitsTable, partnersTable, songRequestsTable, paymentsTable } from '@/lib/db/schema';
import { eq, and, gte, count, sum } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get partner
    const partner = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, parseInt(partnerId)))
      .limit(1);

    if (partner.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Build date filter
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(gte(partnerVisitsTable.first_visit_at, new Date(startDate)));
    }
    if (endDate) {
      dateFilter.push(gte(new Date(endDate), partnerVisitsTable.first_visit_at));
    }

    // Get total visits
    const visits = await db
      .select({
        total_visits: count(),
        unique_visitors: sql<number>`COUNT(DISTINCT ${partnerVisitsTable.anonymous_user_id}) + COUNT(DISTINCT ${partnerVisitsTable.user_id})`,
        conversions: sql<number>`COUNT(CASE WHEN ${partnerVisitsTable.converted} = true THEN 1 END)`,
      })
      .from(partnerVisitsTable)
      .where(
        and(
          eq(partnerVisitsTable.partner_id, parseInt(partnerId)),
          ...dateFilter
        )
      );

    // Get revenue from converted visits
    const revenue = await db
      .select({
        total_revenue: sum(paymentsTable.amount),
        total_payments: count(),
      })
      .from(partnerVisitsTable)
      .innerJoin(songRequestsTable, eq(partnerVisitsTable.id, songRequestsTable.partner_visit_id))
      .innerJoin(paymentsTable, eq(songRequestsTable.id, paymentsTable.song_request_id))
      .where(
        and(
          eq(partnerVisitsTable.partner_id, parseInt(partnerId)),
          eq(paymentsTable.status, 'completed'),
          ...dateFilter
        )
      );

    // Calculate conversion rate
    const conversionRate = visits[0].total_visits > 0
      ? (visits[0].conversions / visits[0].total_visits) * 100
      : 0;

    return NextResponse.json({
      partner: partner[0],
      metrics: {
        total_visits: Number(visits[0].total_visits),
        unique_visitors: Number(visits[0].unique_visitors),
        conversions: Number(visits[0].conversions),
        conversion_rate: Number(conversionRate.toFixed(2)),
        total_revenue: Number(revenue[0]?.total_revenue || 0),
        total_payments: Number(revenue[0]?.total_payments || 0),
      },
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  } catch (error) {
    console.error('Partner analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
```

#### Step 5.2: Create Admin Dashboard Page
**File**: `src/app/admin/partners/page.tsx`

Create an admin page to:
- View all partners
- See analytics for each partner
- Generate QR codes
- Add/edit partners

### Phase 6: Google Analytics Integration

#### Step 6.1: Enhanced GA Tracking
**File**: `src/lib/analytics.ts`

Add partner tracking to Google Analytics:

```typescript
export const trackPartnerVisit = (partnerName: string, utmParams: UTMParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'partner_visit', {
      partner_name: partnerName,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
    });
  }
};
```

---

## 📝 UTM Parameter Strategy

### Standard UTM Format for Partners

**Cake Shops:**
```
https://melodia-songs.com/?utm_source={shop_slug}&utm_medium=qr_code&utm_campaign=partner_referral
```

**Instagram Influencers:**
```
https://melodia-songs.com/?utm_source={influencer_slug}&utm_medium=social&utm_campaign=partner_referral
```

### Example URLs

**Cake Shop Example:**
```
https://melodia-songs.com/?utm_source=sweet-treats-bakery&utm_medium=qr_code&utm_campaign=partner_referral
```

**Influencer Example:**
```
https://melodia-songs.com/?utm_source=music_lover_priya&utm_medium=social&utm_campaign=partner_referral
```

### UTM Parameter Mapping

| Parameter | Purpose | Example Values |
|-----------|---------|----------------|
| `utm_source` | Partner identifier (slug) | `sweet-treats-bakery`, `music_lover_priya` |
| `utm_medium` | Traffic medium | `qr_code`, `social`, `email` |
| `utm_campaign` | Campaign identifier | `partner_referral`, `birthday_promotion` |
| `utm_content` | Specific content (optional) | `qr_code_v1`, `story_highlight` |
| `utm_term` | Keyword (optional) | `birthday_song`, `wedding_song` |

---

## 🔐 Security Considerations

1. **Partner Slug Validation**: Ensure partner slugs are URL-safe and unique
2. **Rate Limiting**: Prevent abuse of UTM tracking API
3. **IP Tracking**: Store IP addresses for fraud detection (GDPR compliant)
4. **Data Retention**: Define retention policy for partner visit data
5. **Admin Access**: Restrict partner management to admin users only

---

## 📊 Reporting & Metrics

### Key Metrics to Track

1. **Visit Metrics**
   - Total visits per partner
   - Unique visitors per partner
   - Average visits per user

2. **Conversion Metrics**
   - Conversion rate (visits → song requests)
   - Time to conversion
   - Conversion by partner type

3. **Revenue Metrics**
   - Total revenue per partner
   - Average order value per partner
   - Revenue per visit

4. **Engagement Metrics**
   - Pages per visit
   - Time on site
   - Bounce rate

### Dashboard Views

1. **Partner Overview**: List all partners with key metrics
2. **Partner Detail**: Detailed analytics for a specific partner
3. **Comparison View**: Compare multiple partners side-by-side
4. **Time Series**: View metrics over time (daily/weekly/monthly)

---

## 🚀 Deployment Checklist

- [ ] Create database migrations
- [ ] Update schema types
- [ ] Implement UTM capture hook
- [ ] Create UTM tracking API
- [ ] Integrate UTM tracking in layout
- [ ] Update song request creation to link partners
- [ ] Update payment tracking
- [ ] Create QR code generator API
- [ ] Create partner management API
- [ ] Create analytics API
- [ ] Build admin dashboard
- [ ] Test UTM tracking flow
- [ ] Test QR code generation
- [ ] Test conversion linking
- [ ] Test analytics queries
- [ ] Add Google Analytics integration
- [ ] Document partner onboarding process
- [ ] Create partner QR code download feature
- [ ] Set up monitoring/alerts

---

## 📚 Additional Resources

### QR Code Libraries
- `qrcode` (Node.js): https://www.npmjs.com/package/qrcode
- `react-qr-code` (React): https://www.npmjs.com/package/react-qr-code

### UTM Parameter Best Practices
- Google Analytics UTM Builder: https://ga-dev-tools.google/campaign-url-builder/
- UTM Parameter Guide: https://blog.hubspot.com/marketing/what-are-utm-tracking-codes-ht

---

## 🔄 Future Enhancements

1. **Commission Tracking**: Track and calculate partner commissions
2. **Automated Reports**: Email weekly/monthly reports to partners
3. **Partner Portal**: Self-service portal for partners to view their stats
4. **A/B Testing**: Test different QR code designs/landing pages
5. **Multi-touch Attribution**: Track multiple touchpoints before conversion
6. **Referral Codes**: Add human-readable referral codes in addition to UTM params
7. **Deep Linking**: Support deep links to specific pages with UTM tracking

