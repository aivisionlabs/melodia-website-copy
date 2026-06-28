# Google Tag Manager Configuration Guide for Melodia

## 📊 Overview

This document outlines the complete Google Tag Manager (GTM) setup for the Melodia platform using the official Next.js `@next/third-parties/google` integration.

## ✅ Current Implementation

### 1. Google Tag Manager Setup

**Location:** `src/app/layout.tsx`

**Configuration:**
- **Container ID:** Set via `NEXT_PUBLIC_GTM_ID` environment variable (format: `GTM-XXXXXXX`)
- **Package:** `@next/third-parties/google` (official Next.js integration)
- **Component:** `GoogleTagManager`

```tsx
// src/app/layout.tsx
import { GoogleTagManager } from "@next/third-parties/google";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en" className="scroll-smooth">
      <body>
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
        {/* ... rest of layout ... */}
      </body>
    </html>
  );
}
```

### ⚠️ Critical: GoogleTagManager vs GoogleAnalytics

**Understanding the difference:**

| Component | Purpose | ID Format | Script Loaded |
|-----------|---------|-----------|---------------|
| `GoogleAnalytics` | GA4 Analytics | `G-XXXXXXX` | `gtag/js` |
| `GoogleTagManager` | Tag Manager Container | `GTM-XXXXXXX` | `gtm.js` |

**Key Points:**
- **GTM** is a container that can manage multiple tags (GA4, Facebook Pixel, etc.)
- **GA4** is a direct analytics implementation
- You can use **both** together, or use **GTM to manage GA4** (recommended for flexibility)

**Common Mistake (WRONG):**
```tsx
// ❌ WRONG - Using GTM component with GA ID
<GoogleTagManager gtmId="G-TJW2DN7ND5" />  // This will NOT work!
```

**Correct Setup (RIGHT):**
```tsx
// ✅ CORRECT - Using GTM component with GTM ID
<GoogleTagManager gtmId="GTM-XXXXXXX" />  // This works correctly!
```

## 🔧 Configuration Instructions

### 1. Get Your GTM Container ID

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Create a new container or select an existing one
3. Your Container ID will be in the format `GTM-XXXXXXX`
4. Copy this ID

### 2. Environment Variables

**Add to `.env.local` and production environment (Vercel):**

```bash
# Google Tag Manager - OPTIONAL
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

**Note:**
- GTM is optional - only add if you're using Google Tag Manager
- If you're using GTM, you can manage GA4 through GTM instead of using the `GoogleAnalytics` component directly

### 3. Verify Setup in Browser

After deploying, verify the setup by checking:

1. **Network Tab:**
   - Should see request to: `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX`
   - Should see request to: `https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX` (noscript fallback)

2. **Console Check:**
```javascript
// In browser console
console.log('dataLayer defined:', typeof window.dataLayer !== 'undefined');
console.log('dataLayer:', window.dataLayer);
```

Expected output:
```
dataLayer defined: true
dataLayer: [Array of events]
```

3. **GTM Preview Mode:**
   - Install [Google Tag Manager Preview Extension](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)
   - Enable preview mode in GTM dashboard
   - Visit your website to see tags firing in real-time

### 4. GTM Container Setup

**In Google Tag Manager Dashboard:**

1. **Add Google Analytics 4 Tag (if using GTM to manage GA4):**
   - Go to Tags → New
   - Tag Type: Google Analytics: GA4 Configuration
   - Measurement ID: `G-TJW2DN7ND5`
   - Trigger: All Pages

2. **Add Custom Events:**
   - Create tags for custom events (song plays, form submissions, etc.)
   - Use triggers to fire tags based on specific conditions

3. **Test in Preview Mode:**
   - Always test tags in preview mode before publishing
   - Verify events are firing correctly

## 📊 Using GTM with Custom Events

### Pushing Events to dataLayer

GTM uses the `dataLayer` to receive events. You can push custom events from your code:

```typescript
// Push event to GTM dataLayer
if (typeof window !== 'undefined' && window.dataLayer) {
  window.dataLayer.push({
    event: 'song_play',
    song_id: '123',
    song_title: 'Birthday Song',
    duration: 180,
  });
}
```

### Creating GTM Tags for Custom Events

1. **In GTM Dashboard:**
   - Go to Tags → New
   - Tag Type: Google Analytics: GA4 Event
   - Configuration Tag: Select your GA4 Configuration tag
   - Event Name: `song_play`
   - Event Parameters:
     - `song_id`: `{{song_id}}`
     - `song_title`: `{{song_title}}`
     - `duration`: `{{duration}}`
   - Trigger: Custom Event → Event name: `song_play`

2. **Create Data Layer Variables:**
   - Go to Variables → User-Defined Variables → New
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `song_id`
   - Repeat for other parameters

## 🔄 Integration with Existing Analytics

### Option 1: Use GTM to Manage GA4 (Recommended)

If you're using GTM, you can remove the direct `GoogleAnalytics` component and manage GA4 through GTM:

```tsx
// Remove this:
<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""} />

// Keep only GTM:
{gtmId && <GoogleTagManager gtmId={gtmId} />}
```

Then configure GA4 as a tag in GTM (see "GTM Container Setup" above).

### Option 2: Use Both GTM and Direct GA4

You can use both if needed:
- GTM for managing multiple tags (Facebook Pixel, LinkedIn, etc.)
- Direct GA4 for immediate analytics without GTM overhead

```tsx
{gtmId && <GoogleTagManager gtmId={gtmId} />}
{gaId && <GoogleAnalytics gaId={gaId} />}
```

## 📝 Common GTM Tags for Melodia

### 1. Song Play Event
```javascript
// In your code
window.dataLayer.push({
  event: 'song_play',
  song_id: songId,
  song_title: songTitle,
  duration: duration,
  is_demo: isDemo,
});
```

### 2. Form Submission Event
```javascript
window.dataLayer.push({
  event: 'form_submit',
  form_name: 'song_request',
  form_type: 'create_song',
  request_id: requestId,
});
```

### 3. CTA Click Event
```javascript
window.dataLayer.push({
  event: 'cta_click',
  cta_name: 'Create Song Button',
  cta_location: 'homepage',
  cta_type: 'button',
});
```

### 4. Payment Event
```javascript
window.dataLayer.push({
  event: 'purchase',
  transaction_id: orderId,
  value: amount,
  currency: 'INR',
  items: [{
    item_name: packageName,
    price: amount,
    quantity: 1,
  }],
});
```

## 🐛 Debugging

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `window.dataLayer is undefined` | GTM not loaded | Check GTM ID is correct and component is rendered |
| Tags not firing | Wrong trigger setup | Use GTM Preview mode to debug |
| Events not appearing in GA4 | GA4 tag not configured | Add GA4 Configuration tag in GTM |
| Duplicate events | Both GTM and direct GA4 | Remove one or configure to avoid duplicates |

### Testing Events Manually

```javascript
// In browser console
if (window.dataLayer) {
  window.dataLayer.push({
    event: 'test_event',
    test_param: 'test_value',
  });
  console.log('Event pushed to dataLayer:', window.dataLayer);
} else {
  console.error('dataLayer not defined - check GTM setup');
}
```

### Using GTM Preview Mode

1. Go to GTM Dashboard → Preview
2. Enter your website URL
3. Install the GTM Preview extension if prompted
4. Visit your website - you'll see all tags firing in real-time
5. Check which tags fire on which events

## 📈 Best Practices

### 1. Use GTM for Flexibility
- Manage all marketing tags in one place
- No code changes needed to add new tags
- Easy to test and debug

### 2. Organize Your Tags
- Use descriptive tag names
- Group related tags with folders
- Use consistent naming conventions

### 3. Use Triggers Effectively
- Create reusable triggers
- Use built-in triggers when possible
- Test triggers in preview mode

### 4. Version Control
- Always create a new version before publishing
- Add descriptive version notes
- Test thoroughly before publishing

## 📝 Summary

### Setup Checklist

- [x] Get GTM Container ID from Google Tag Manager
- [x] Set `NEXT_PUBLIC_GTM_ID` environment variable
- [x] `GoogleTagManager` component added to layout.tsx
- [x] Verify GTM scripts loading in browser network tab
- [x] Test in GTM Preview mode
- [ ] Configure GA4 tag in GTM (if using GTM to manage GA4)
- [ ] Set up custom event tags
- [ ] Test all events in preview mode
- [ ] Publish GTM container

### Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | GoogleTagManager component placement |
| `.env.local` | GTM Container ID configuration |
| GTM Dashboard | Tag configuration and management |

## 🔗 Additional Resources

- [Next.js Third Party Libraries - Google Tag Manager](https://nextjs.org/docs/app/guides/third-party-libraries#google-tag-manager)
- [Google Tag Manager Documentation](https://developers.google.com/tag-manager)
- [GTM Data Layer Guide](https://developers.google.com/tag-manager/devguide)
- [GTM Preview Mode Guide](https://support.google.com/tagmanager/answer/6107056)
- [@next/third-parties npm package](https://www.npmjs.com/package/@next/third-parties)

