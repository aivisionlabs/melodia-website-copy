'use client';

import { useEffect } from 'react';
import { detectLLMReferrer, trackLLMReferralEvent } from '@/lib/analytics';

const SESSION_KEY = 'llm_referrer_tracked';

/**
 * Detects whether the current session originated from an AI/LLM source
 * (ChatGPT, Perplexity, Gemini, Claude, etc.) and fires a single GA4
 * event + user property per session so the traffic can be segmented.
 */
export function useLLMReferrerTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;

      const referrer = document.referrer;
      const llmSource = detectLLMReferrer(referrer);
      if (!llmSource) return;

      sessionStorage.setItem(SESSION_KEY, llmSource);

      trackLLMReferralEvent.referral(
        llmSource,
        window.location.pathname,
        referrer,
      );
    } catch {
      // sessionStorage may be unavailable in private browsing edge cases
    }
  }, []);
}
