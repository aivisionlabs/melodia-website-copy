# Google Analytics Configuration Guide for Melodia

## 📊 Overview

This document outlines the complete Google Analytics setup for the Melodia platform using the official Next.js `@next/third-parties/google` integration.

## ✅ Current Implementation

### 1. Google Analytics Setup (Correct Configuration)

**Location:** `src/app/layout.tsx`

**Configuration:**
- **Measurement ID:** `G-TJW2DN7ND5` (set via environment variable)
- **Package:** `@next/third-parties/google` (official Next.js integration)
- **Component:** `GoogleAnalytics` (NOT `GoogleTagManager`)

```tsx
// src/app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""} />
      <head>
        {/* ... */}
      </head>
      <body>
        {/* ... */}
      </body>
    </html>
  );
}
```

### ⚠️ Critical: GoogleAnalytics vs GoogleTagManager

**DO NOT confuse these two components:**

| Component | Purpose | ID Format | Script Loaded |
|-----------|---------|-----------|---------------|
| `GoogleAnalytics` | GA4 Analytics | `G-XXXXXXX` | `gtag/js` |
| `GoogleTagManager` | Tag Manager Container | `GTM-XXXXXXX` | `gtm.js` |

**Common Mistake (WRONG):**
```tsx
// ❌ WRONG - Using GTM component with GA ID
import { GoogleTagManager } from "@next/third-parties/google";
<GoogleTagManager gtmId="G-TJW2DN7ND5" />  // This will NOT work!
```

**Correct Setup (RIGHT):**
```tsx
// ✅ CORRECT - Using GA component with GA ID
import { GoogleAnalytics } from "@next/third-parties/google";
<GoogleAnalytics gaId="G-TJW2DN7ND5" />  // This works correctly!
```

### 2. Event Tracking with sendGAEvent

**Location:** `src/lib/analytics.ts`

The analytics utility uses Next.js's official `sendGAEvent` function:

```typescript
import { sendGAEvent } from '@next/third-parties/google';

// Example event tracking
export const trackEvent = (category: string, action: string, label?: string) => {
  if (typeof window === 'undefined') return;

  try {
    sendGAEvent('event', action, {
      event_category: category,
      event_label: label,
    });
  } catch {
    // Fallback to window.gtag if available
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
      });
    }
  }
};
```

### 3. Automatic Pageview Tracking

**Important:** According to Next.js documentation:

> "Google Analytics automatically tracks pageviews when the browser history state changes. This means that client-side navigations between Next.js routes will send pageview data without any configuration."

This means you don't need manual pageview tracking for most cases. However, we still have custom page tracking for enhanced page titles:

**Location:** `src/hooks/use-page-tracking.ts` and `src/components/PageTracking.tsx`

### 4. Analytics Utility Library

**Location:** `src/lib/analytics.ts`

**Available Tracking Functions:**
- Player events (play, pause, seek, skip, audio load, error, end)
- Navigation events (page view, click, navigate)
- Engagement events (share, copy link, lyric click/scroll, like)
- Search events (search, results, suggestions, no results)
- CTA events (CTA click, form submit, WhatsApp contact)
- Partner/UTM tracking

### 5. Currently Tracked Components

**Files with analytics tracking:**
- ✅ `src/components/MediaPlayer.tsx` - Audio player interactions
- ✅ `src/components/FullPageMediaPlayer.tsx` - Full-page player interactions
- ✅ `src/components/SongLikeButton.tsx` - Like button clicks
- ✅ `src/components/LibrarySearchBar.tsx` - Search functionality
- ✅ `src/components/search-bar.tsx` - General search
- ✅ `src/components/ShareRequirementsCTA.tsx` - CTA clicks
- ✅ `src/components/WhatsAppCTA.tsx` - WhatsApp contact
- ✅ `src/hooks/useAudioPlayer.ts` - Audio player events
- ✅ `src/app/page.tsx` - Homepage navigation
- ✅ `src/lib/actions.ts` - Form submissions (some)

---

## 🔧 Configuration Instructions

### 1. Environment Variables

**Add to `.env.local` and production environment (Vercel):**

```bash
# Google Analytics - REQUIRED
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TJW2DN7ND5
```

### 2. Verify Setup in Browser

After deploying, verify the setup by checking:

1. **Network Tab:**
   - Should see request to: `https://www.googletagmanager.com/gtag/js?id=G-TJW2DN7ND5`
   - Should NOT see: `https://www.googletagmanager.com/gtm.js?id=G-TJW2DN7ND5`

2. **Console Check:**
```javascript
// In browser console
console.log('gtag defined:', typeof window.gtag !== 'undefined');
console.log('dataLayer:', window.dataLayer);
```

Expected output:
```
gtag defined: true
dataLayer: [Array of events]
```

### 3. Verify in Google Analytics

**In Google Analytics Dashboard:**

1. **Real-time Reports:**
   - Go to Google Analytics → Realtime
   - Verify pageviews are appearing

2. **Debug View:**
   - Go to Admin → DebugView
   - Use Chrome GA Debugger extension to test events

### 4. Enable Enhanced Measurement

**In GA4 Admin Panel:**
1. Go to Admin → Data Streams
2. Click on your web stream
3. Enable "Enhanced measurement" for automatic tracking:
   - Scrolls
   - Outbound clicks
   - Site search
   - Video engagement
   - File downloads

---

## 📊 Key Tracking Patterns

### Tracking a Custom Event

```typescript
import { sendGAEvent } from '@next/third-parties/google';

// Basic event
sendGAEvent('event', 'button_click', { value: 'xyz' });

// Event with parameters
sendGAEvent('event', 'song_play', {
  song_id: '123',
  song_title: 'Birthday Song',
  duration: 180,
});
```

### Tracking a Conversion

```typescript
// Track a conversion event (mark as conversion in GA4 admin)
sendGAEvent('event', 'song_request_completed', {
  request_id: '456',
  occasion: 'birthday',
  value: 599,  // Value in smallest currency unit
});
```

### Using the Analytics Utility

```typescript
import { trackCTAEvent, trackPlayerEvent } from '@/lib/analytics';

// Track CTA click
trackCTAEvent.ctaClick('Create Song Button', 'homepage', 'button');

// Track song play
trackPlayerEvent.play('Birthday Song', 'song-123', false);
```

---

## 🐛 Debugging

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `window.gtag is undefined` | Wrong component used | Use `GoogleAnalytics` not `GoogleTagManager` |
| No data in GA4 | Missing env variable | Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Wrong script loading | Using GTM ID with GA component | Ensure ID starts with `G-` not `GTM-` |
| Events not firing | Not in browser context | Check `typeof window !== 'undefined'` |

### Testing Events Manually

```javascript
// In browser console
if (window.gtag) {
  window.gtag('event', 'test_event', {
    event_category: 'test',
    event_label: 'manual_test',
    value: 1
  });
  console.log('Event sent successfully');
} else {
  console.error('gtag not defined - check GA setup');
}
```

### Using GA Debugger

1. Install Chrome extension: "Google Analytics Debugger"
2. Enable it to see all events in console
3. Events will appear in DevTools console

---

## 📈 GA4 Dashboard Setup

### 1. Mark Conversions

Go to Admin → Events and mark these as conversions:
- `song_request_completed`
- `form_submit`
- `whatsapp_contact`

### 2. Create Custom Reports

1. **User Journey Funnel:**
   - Homepage view → CTA impression → CTA click → Form completion

2. **Content Performance:**
   - Most played songs
   - Most viewed occasions
   - Search query analysis

### 3. Set Up Audiences

Create audiences for:
- Frequent users (5+ sessions)
- Song creators (completed song request)
- Occasion browsers (viewed 3+ occasion pages)

---

## 📝 Summary

### Setup Checklist

- [x] Use `GoogleAnalytics` component (not `GoogleTagManager`)
- [x] Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` environment variable
- [x] Use `sendGAEvent` from `@next/third-parties/google` for events
- [x] Verify `window.gtag` is defined in browser
- [x] Check network tab for correct gtag.js script loading
- [ ] Enable Enhanced Measurement in GA4 admin
- [ ] Mark conversion events in GA4 admin
- [ ] Set up custom reports and audiences

### Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | GoogleAnalytics component placement |
| `src/lib/analytics.ts` | Event tracking utility functions |
| `src/hooks/use-page-tracking.ts` | Custom pageview tracking |
| `src/components/PageTracking.tsx` | Page tracking component |

---

## 🔗 Additional Resources

- [Next.js Third Party Libraries - Google Analytics](https://nextjs.org/docs/app/guides/third-party-libraries#google-analytics)
- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [GA4 Event Parameters](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [@next/third-parties npm package](https://www.npmjs.com/package/@next/third-parties)
