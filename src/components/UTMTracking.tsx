/**
 * UTMTracking Component
 * Client component that tracks UTM parameters on page load
 */

'use client';

import { useUTMTracking } from '@/hooks/use-utm-tracking';

export function UTMTracking() {
  // This hook handles all UTM tracking logic
  useUTMTracking();

  // Component doesn't render anything
  return null;
}

