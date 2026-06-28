/**
 * useUTMTracking Hook
 * Captures UTM parameters from URL and stores them for partner tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function useUTMTracking() {
  const searchParams = useSearchParams();
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return;

    const utm: UTMParams = {};
    const source = searchParams.get('utm_source');
    const medium = searchParams.get('utm_medium');
    const campaign = searchParams.get('utm_campaign');
    const content = searchParams.get('utm_content');
    const term = searchParams.get('utm_term');

    // If UTM parameters are present in URL, capture them
    if (source || medium || campaign) {
      if (source) utm.utm_source = source;
      if (medium) utm.utm_medium = medium;
      if (campaign) utm.utm_campaign = campaign;
      if (content) utm.utm_content = content;
      if (term) utm.utm_term = term;

      setUtmParams(utm);

      // Store in sessionStorage for persistence across navigation
      sessionStorage.setItem('utm_params', JSON.stringify(utm));
      sessionStorage.setItem('utm_params_timestamp', Date.now().toString());

      // Send to API to store (only once per session)
      if (!isTracking) {
        setIsTracking(true);

        // Track in Google Analytics (non-blocking)
        if (typeof window !== 'undefined') {
          import('@/lib/analytics').then(({ trackPartnerVisit }) => {
            trackPartnerVisit(utm.utm_source || null, utm);
          }).catch(() => {
            // Silently fail if GA tracking fails
          });
        }

        // Track in database
        trackUTMVisit(utm).catch((error) => {
          console.error('Failed to track UTM visit:', error);
        });
      }
    } else {
      // Check if UTM params exist in sessionStorage (from previous visit)
      const stored = sessionStorage.getItem('utm_params');
      const storedTimestamp = sessionStorage.getItem('utm_params_timestamp');

      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          // Only use stored params if they're less than 30 days old
          if (storedTimestamp) {
            const age = Date.now() - parseInt(storedTimestamp, 10);
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            if (age < thirtyDays) {
              setUtmParams(parsed);
            } else {
              // Clear expired UTM params
              sessionStorage.removeItem('utm_params');
              sessionStorage.removeItem('utm_params_timestamp');
            }
          } else {
            setUtmParams(parsed);
          }
        } catch (e) {
          // Invalid stored data, clear it
          sessionStorage.removeItem('utm_params');
          sessionStorage.removeItem('utm_params_timestamp');
        }
      }
    }
  }, [searchParams, isTracking]);

  return utmParams;
}

async function trackUTMVisit(utm: UTMParams) {
  try {
    const response = await fetch('/api/track-utm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...utm,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        landing_page: typeof window !== 'undefined' ? window.location.pathname : '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to track UTM: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('UTM tracking error:', error);
    throw error;
  }
}

