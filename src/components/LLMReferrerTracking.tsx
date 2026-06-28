'use client';

import { useLLMReferrerTracking } from '@/hooks/use-llm-referrer-tracking';

export function LLMReferrerTracking() {
  useLLMReferrerTracking();
  return null;
}
