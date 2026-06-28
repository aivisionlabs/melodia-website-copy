import { isGaExcludedPathname } from '@/lib/ga-exclusion';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// ---------------------------------------------------------------------------
// Core primitive — everything funnels through here
// ---------------------------------------------------------------------------

const send = (eventName: string, params: Record<string, any> = {}) => {
  if (typeof window === 'undefined') return;
  if (isGaExcludedPathname(window.location.pathname)) return;
  window.gtag?.('event', eventName, params);
};

// ---------------------------------------------------------------------------
// Meta Pixel primitive
// ---------------------------------------------------------------------------

const pixel = (eventType: 'track' | 'trackCustom', eventName: string, params?: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq(eventType, eventName, params);
};

// ---------------------------------------------------------------------------
// Meta Pixel events
// ---------------------------------------------------------------------------

export const trackPixelEvent = {
  /** Package selected on create page — signals purchase intent */
  addToCart: (packageName: string, price: number) => {
    pixel('track', 'AddToCart', {
      content_name: packageName,
      content_type: 'product',
      value: price,
      currency: 'INR',
    });
  },

  /** Razorpay/Cashfree checkout opened */
  initiateCheckout: (packageName: string, price: number) => {
    pixel('track', 'InitiateCheckout', {
      content_name: packageName,
      num_items: 1,
      value: price,
      currency: 'INR',
    });
  },

  /** Payment completed — primary conversion event */
  purchase: (packageName: string, price: number, orderId: string) => {
    pixel('track', 'Purchase', {
      content_name: packageName,
      content_type: 'product',
      value: price,
      currency: 'INR',
      order_id: orderId,
    });
  },
};

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export const trackPlayerEvent = {
  play: (songTitle: string, songId: string, isDemo = false, metadata?: Record<string, any>) => {
    send('play', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      is_demo: isDemo,
      ...metadata,
    });
  },

  pause: (songTitle: string, songId: string, currentTime: number, metadata?: Record<string, any>) => {
    send('pause', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      current_time: Math.round(currentTime),
      ...metadata,
    });
  },

  seek: (songTitle: string, songId: string, fromTime: number, toTime: number, metadata?: Record<string, any>) => {
    send('seek', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      from_time: Math.round(fromTime),
      to_time: Math.round(toTime),
      seek_difference: Math.round(toTime - fromTime),
      ...metadata,
    });
  },

  skipForward: (songTitle: string, songId: string, skipSeconds: number, metadata?: Record<string, any>) => {
    send('skip_forward', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      skip_seconds: skipSeconds,
      ...metadata,
    });
  },

  skipBackward: (songTitle: string, songId: string, skipSeconds: number, metadata?: Record<string, any>) => {
    send('skip_backward', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      skip_seconds: skipSeconds,
      ...metadata,
    });
  },

  audioLoad: (songTitle: string, songId: string, loadTime?: number, metadata?: Record<string, any>) => {
    send('audio_load', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      load_time: loadTime,
      ...metadata,
    });
  },

  audioError: (songTitle: string, songId: string, errorType: string, metadata?: Record<string, any>) => {
    send('audio_error', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      error_type: errorType,
      ...metadata,
    });
  },

  audioEnd: (songTitle: string, songId: string, totalDuration: number, metadata?: Record<string, any>) => {
    send('audio_end', {
      event_category: 'player',
      song_title: songTitle,
      song_id: songId,
      total_duration: Math.round(totalDuration),
      ...metadata,
    });
  },
};

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const trackNavigationEvent = {
  click: (elementName: string, pageUrl: string, elementType = 'button') => {
    send('nav_click', {
      event_category: 'navigation',
      element_name: elementName,
      page_url: pageUrl,
      element_type: elementType,
    });
  },

  navigate: (fromPage: string, toPage: string) => {
    send('navigate', {
      event_category: 'navigation',
      from_page: fromPage,
      to_page: toPage,
    });
  },
};

export const trackMySongsNudgeEvent = {
  impression: (
    nudgeType: 'request_captured' | 'song_generated',
    requestId: number,
    pagePath: string
  ) => {
    send('my_songs_nudge_impression', {
      event_category: 'navigation',
      nudge_type: nudgeType,
      request_id: requestId,
      page_path: pagePath,
    });
  },

  click: (
    nudgeType: 'request_captured' | 'song_generated',
    requestId: number,
    pagePath: string
  ) => {
    send('my_songs_nudge_click', {
      event_category: 'navigation',
      nudge_type: nudgeType,
      request_id: requestId,
      page_path: pagePath,
    });
  },

  autoDismiss: (
    nudgeType: 'request_captured' | 'song_generated',
    requestId: number,
    pagePath: string,
    visibleMs: number
  ) => {
    send('my_songs_nudge_auto_dismiss', {
      event_category: 'navigation',
      nudge_type: nudgeType,
      request_id: requestId,
      page_path: pagePath,
      visible_ms: visibleMs,
    });
  },
};

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export const trackEngagementEvent = {
  share: (songTitle: string, songId: string, shareMethod: string) => {
    send('share', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
      share_method: shareMethod,
    });
  },

  copyLink: (songTitle: string, songId: string) => {
    send('copy_link', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
    });
  },

  lyricClick: (songTitle: string, songId: string, lyricIndex: number, lyricText: string) => {
    send('lyric_click', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
      lyric_index: lyricIndex,
      lyric_text: lyricText.substring(0, 50),
    });
  },

  lyricScroll: (songTitle: string, songId: string, scrollDirection: 'up' | 'down') => {
    send('lyric_scroll', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
      scroll_direction: scrollDirection,
    });
  },

  like: (songTitle: string, songId: string, pageContext: string, likeCount: number) => {
    send('like', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
      page_context: pageContext,
      like_count: likeCount,
    });
  },

  download: (songTitle: string, songId: string) => {
    send('download', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
    });
  },

  downloadStart: (songTitle: string, songId: string) => {
    send('download_start', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
    });
  },

  useSongTemplate: (songTitle: string, songId: string, pageContext: string) => {
    send('use_song_template', {
      event_category: 'engagement',
      song_title: songTitle,
      song_id: songId,
      page_context: pageContext,
    });
  },

  categoryFilter: (category: string) => {
    send('library_category_filter', {
      event_category: 'engagement',
      category,
    });
  },
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const trackSearchEvent = {
  search: (query: string, resultsCount: number, searchType: 'text' | 'voice' = 'text', searchMethod: 'fuzzy' | 'exact' = 'fuzzy') => {
    send('search', {
      event_category: 'search',
      query,
      query_length: query.length,
      results_count: resultsCount,
      search_type: searchType,
      search_method: searchMethod,
    });
  },

  searchResult: (query: string, resultTitle: string, resultPosition: number) => {
    send('search_result', {
      event_category: 'search',
      query,
      result_title: resultTitle,
      result_position: resultPosition,
    });
  },

  searchSuggestion: (query: string, suggestion: string, suggestionType: 'title' | 'category' | 'style' | 'description') => {
    send('search_suggestion', {
      event_category: 'search',
      query,
      suggestion,
      suggestion_type: suggestionType,
    });
  },

  searchNoResults: (query: string, searchType: 'text' | 'voice' = 'text') => {
    send('search_no_results', {
      event_category: 'search',
      query,
      query_length: query.length,
      search_type: searchType,
    });
  },
};

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------

export const trackCTAEvent = {
  ctaClick: (ctaName: string, ctaLocation: string, ctaType = 'button') => {
    send('cta_click', {
      event_category: 'cta',
      cta_name: ctaName,
      cta_location: ctaLocation,
      cta_type: ctaType,
    });
  },

  ctaImpression: (ctaName: string, ctaLocation: string) => {
    send('cta_impression', {
      event_category: 'cta',
      cta_name: ctaName,
      cta_location: ctaLocation,
    });
  },

  formSubmit: (formName: string, formType: string) => {
    send('form_submit', {
      event_category: 'cta',
      form_name: formName,
      form_type: formType,
    });
  },

  whatsappContact: (source: string) => {
    send('whatsapp_contact', {
      event_category: 'cta',
      // NOTE: `source` is a GA4-reserved attribution param — must not be sent
      // as a bare key or it pollutes session source/medium. Use `cta_source`.
      cta_source: source,
    });
  },
};

// ---------------------------------------------------------------------------
// Partner / UTM tracking
// ---------------------------------------------------------------------------

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export const trackPartnerVisit = (partnerName: string | null, utmParams: UTMParams) => {
  send('partner_visit', {
    event_category: 'partner',
    partner_name: partnerName || utmParams.utm_source || 'unknown',
    utm_source: utmParams.utm_source || '',
    utm_medium: utmParams.utm_medium || '',
    utm_campaign: utmParams.utm_campaign || '',
    utm_content: utmParams.utm_content || '',
    utm_term: utmParams.utm_term || '',
  });
};

// ---------------------------------------------------------------------------
// LLM / AI referrer tracking
// ---------------------------------------------------------------------------

const LLM_REFERRER_PATTERNS: { pattern: string; source: string }[] = [
  { pattern: 'chat.openai.com', source: 'chatgpt' },
  { pattern: 'chatgpt.com', source: 'chatgpt' },
  { pattern: 'perplexity.ai', source: 'perplexity' },
  { pattern: 'gemini.google.com', source: 'gemini' },
  { pattern: 'bard.google.com', source: 'gemini' },
  { pattern: 'claude.ai', source: 'claude' },
  { pattern: 'copilot.microsoft.com', source: 'copilot' },
  { pattern: 'you.com', source: 'you' },
];

export function detectLLMReferrer(referrer: string): string | null {
  if (!referrer) return null;
  const lower = referrer.toLowerCase();
  for (const { pattern, source } of LLM_REFERRER_PATTERNS) {
    if (lower.includes(pattern)) return source;
  }
  return null;
}

export const trackLLMReferralEvent = {
  referral: (llmSource: string, landingPage: string, rawReferrer: string) => {
    if (typeof window === 'undefined') return;
    if (isGaExcludedPathname(window.location.pathname)) return;
    try {
      window.gtag?.('set', 'user_properties', {
        llm_source: llmSource,
        is_llm_traffic: 'true',
      });
    } catch { /* best-effort */ }

    send('llm_referral', {
      event_category: 'llm_traffic',
      llm_source: llmSource,
      landing_page: landingPage,
      raw_referrer: rawReferrer,
    });
  },
};

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

export const trackFunnelEvent = {
  pricingPageView: () => {
    send('view_pricing_page', { event_category: 'funnel', funnel_step: 'pricing' });
  },

  packageView: (packageName: string, packagePrice: number) => {
    send('view_item', {
      event_category: 'funnel',
      item_name: packageName,
      price: packagePrice,
      currency: 'INR',
      funnel_step: 'pricing',
    });
  },

  packageSelect: (packageName: string, packagePrice: number, packageId: string) => {
    send('select_item', {
      event_category: 'funnel',
      item_name: packageName,
      item_id: packageId,
      price: packagePrice,
      currency: 'INR',
      funnel_step: 'pricing',
    });
  },

  /** Create page loaded with `?plan=` (e.g. from /pricing) — distinct from pricing `select_item`. */
  createPlanPrefilled: (
    packageName: string,
    packagePrice: number,
    packageId: string,
  ) => {
    send('create_plan_prefilled', {
      event_category: 'funnel',
      funnel_step: 'create_request',
      item_name: packageName,
      item_id: packageId,
      price: packagePrice,
      currency: 'INR',
    });
  },

  formStepView: (stepNumber: number, stepName: string) => {
    send('form_step_view', {
      event_category: 'funnel',
      step_number: stepNumber,
      step_name: stepName,
      funnel_step: 'create_request',
    });
  },

  formStepComplete: (stepNumber: number, stepName: string) => {
    send('form_step_complete', {
      event_category: 'funnel',
      step_number: stepNumber,
      step_name: stepName,
      funnel_step: 'create_request',
    });
  },

  inputModeChange: (mode: string) => {
    send('create_input_mode_change', {
      event_category: 'funnel',
      input_mode: mode,
      funnel_step: 'create_request',
    });
  },

  /** Music-style picker toggled between reference song and vibe/mood (story step). */
  musicStyleModeChange: (mode: 'reference' | 'vibe') => {
    send('create_song_music_mode_change', {
      event_category: 'funnel',
      music_mode: mode,
      funnel_step: 'create_request',
    });
  },

  /** A mood chip in the vibe picker was selected or deselected. */
  vibeMoodToggle: (mood: string, selected: boolean, totalSelected: number) => {
    send('create_song_vibe_toggle', {
      event_category: 'funnel',
      mood,
      selected,
      total_selected: totalSelected,
      funnel_step: 'create_request',
    });
  },

  /** A reference song in the story-step picker strip was selected or deselected. */
  referenceSongToggle: (songId: number, songTitle: string, selected: boolean) => {
    send('create_song_reference_toggle', {
      event_category: 'funnel',
      song_id: songId,
      song_title: songTitle,
      selected,
      funnel_step: 'create_request',
    });
  },

  /** A story inspiration suggestion was picked into the story field. */
  storySuggestionPick: () => {
    send('create_song_story_suggestion_pick', {
      event_category: 'funnel',
      funnel_step: 'create_request',
    });
  },

  /** Recipient name script/dialect confirmed via the transliteration helper. */
  recipientNameScriptConfirm: (
    language: string,
    method: 'transliterated' | 'alternate' | 'manual' | 'english_kept',
  ) => {
    send('create_song_name_script_confirm', {
      event_category: 'funnel',
      language,
      method,
      funnel_step: 'create_request',
    });
  },

  paymentReviewView: (requestId: number | string) => {
    send('payment_request_review_view', {
      event_category: 'funnel',
      request_id: requestId,
      funnel_step: 'payment',
    });
  },

  songRequestSubmit: (requestId: number, packageId: string | undefined) => {
    send('song_request_submit', {
      event_category: 'funnel',
      request_id: requestId,
      package_id: packageId || 'unknown',
      funnel_step: 'create_request',
    });
  },

  lyricsGenerationStart: (requestId: number) => {
    send('lyrics_generation_start', {
      event_category: 'funnel',
      request_id: requestId,
      funnel_step: 'lyrics',
    });
  },

  lyricsGenerationComplete: (requestId: number, version: number) => {
    send('lyrics_generation_complete', {
      event_category: 'funnel',
      request_id: requestId,
      lyrics_version: version,
      funnel_step: 'lyrics',
    });
  },

  lyricsEdit: (requestId: number, editType: 'ai_refine' | 'manual') => {
    send('lyrics_edit', {
      event_category: 'funnel',
      request_id: requestId,
      edit_type: editType,
      funnel_step: 'lyrics',
    });
  },

  lyricsApproved: (requestId: number, version: number) => {
    send('lyrics_approved', {
      event_category: 'funnel',
      request_id: requestId,
      lyrics_version: version,
      funnel_step: 'lyrics',
    });
  },

  songOptionsView: (songId: string) => {
    send('song_options_view', {
      event_category: 'funnel',
      song_id: songId,
      funnel_step: 'song_options',
    });
  },

  songVariantPlay: (songId: string, variantIndex: number) => {
    send('song_variant_play', {
      event_category: 'funnel',
      song_id: songId,
      variant_index: variantIndex,
      funnel_step: 'song_options',
    });
  },

  songVariantSelect: (songId: string, variantIndex: number) => {
    send('song_variant_select', {
      event_category: 'funnel',
      song_id: songId,
      variant_index: variantIndex,
      funnel_step: 'song_options',
    });
  },

  songVariantReject: (songId: string, variantIndex: number, reason?: string) => {
    send('song_variant_reject', {
      event_category: 'funnel',
      song_id: songId,
      variant_index: variantIndex,
      ...(reason && { reason }),
      funnel_step: 'song_options',
    });
  },

  songVariantSwitch: (songId: string, fromIndex: number, toIndex: number) => {
    send('song_variant_switch', {
      event_category: 'funnel',
      song_id: songId,
      from_variant: fromIndex,
      to_variant: toIndex,
      funnel_step: 'song_options',
    });
  },
};

// ---------------------------------------------------------------------------
// Payment (GA4 Ecommerce)
// ---------------------------------------------------------------------------

export const trackPaymentEvent = {
  paymentPageView: (requestId: number, amount: number, packageName: string) => {
    send('begin_checkout', {
      event_category: 'payment',
      request_id: requestId,
      currency: 'INR',
      value: amount,
      items: [{ item_name: packageName, price: amount, quantity: 1 }],
      funnel_step: 'payment',
    });
  },

  paymentInitiated: (requestId: number, amount: number, paymentProvider: string, packageName?: string) => {
    send('add_payment_info', {
      event_category: 'payment',
      request_id: requestId,
      payment_provider: paymentProvider,
      currency: 'INR',
      value: amount,
      items: packageName
        ? [{ item_id: requestId.toString(), item_name: packageName, price: amount, quantity: 1 }]
        : [],
      funnel_step: 'payment',
    });
  },

  paymentCompleted: (requestId: number, amount: number, orderId: string, songTitle: string, songId?: number) => {
    send('purchase', {
      event_category: 'payment',
      transaction_id: orderId,
      request_id: requestId,
      song_id: songId,
      currency: 'INR',
      value: amount,
      items: [{
        item_id: songId?.toString() || requestId.toString(),
        item_name: songTitle,
        price: amount,
        quantity: 1,
      }],
      funnel_step: 'payment_success',
    });
  },

  paymentFailed: (requestId: number, amount: number, errorMessage: string, packageName?: string) => {
    send('payment_failed', {
      event_category: 'payment',
      request_id: requestId,
      currency: 'INR',
      value: amount,
      error_message: errorMessage,
      items: packageName
        ? [{ item_id: requestId.toString(), item_name: packageName, price: amount, quantity: 1 }]
        : [],
      funnel_step: 'payment',
    });
  },

  paymentCancelled: (requestId: number, amount: number) => {
    send('payment_cancelled', {
      event_category: 'payment',
      request_id: requestId,
      currency: 'INR',
      value: amount,
      funnel_step: 'payment',
    });
  },
};

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export const trackVideoEvent = {
  videoStart: (videoName: string, videoLocation: string) => {
    send('video_start', {
      event_category: 'video',
      video_title: videoName,
      video_location: videoLocation,
    });
  },

  videoPause: (videoName: string, currentTime: number, duration: number) => {
    send('video_pause', {
      event_category: 'video',
      video_title: videoName,
      video_current_time: Math.round(currentTime),
      video_duration: Math.round(duration),
      video_percent: duration > 0 ? Math.round((currentTime / duration) * 100) : 0,
    });
  },

  videoProgress: (videoName: string, percent: number, currentTime: number) => {
    send('video_progress', {
      event_category: 'video',
      video_title: videoName,
      video_percent: percent,
      video_current_time: Math.round(currentTime),
    });
  },

  videoComplete: (videoName: string, duration: number) => {
    send('video_complete', {
      event_category: 'video',
      video_title: videoName,
      video_duration: Math.round(duration),
    });
  },
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const trackAuthEvent = {
  // NOTE: `source` is a GA4-reserved attribution param — send it as `auth_source`
  // so it does not override session source/medium (showing as "(not set)").
  loginView: (source = 'direct') => {
    send('login_view', { event_category: 'auth', auth_source: source });
  },

  signupView: (source = 'direct') => {
    send('sign_up_view', { event_category: 'auth', auth_source: source });
  },

  loginAttempt: (method: 'email' | 'google') => {
    send('login_attempt', { event_category: 'auth', method });
  },

  signupAttempt: (method: 'email' | 'google') => {
    send('sign_up_attempt', { event_category: 'auth', method });
  },

  loginSuccess: (method: 'email' | 'google') => {
    send('login_success', { event_category: 'auth', method });
  },

  signupSuccess: (method: 'email' | 'google') => {
    send('sign_up_success', { event_category: 'auth', method });
  },

  logout: (source: string) => {
    send('logout', { event_category: 'auth', auth_source: source });
  },
};

// ---------------------------------------------------------------------------
// Occasion
// ---------------------------------------------------------------------------

export const trackOccasionEvent = {
  viewOccasion: (occasionType: string, occasionSlug: string) => {
    send('view_occasion', {
      event_category: 'occasion',
      occasion_type: occasionType,
      occasion_slug: occasionSlug,
    });
  },

  clickOccasion: (occasionLabel: string, occasionSlug: string, source: string) => {
    send('click_occasion', {
      event_category: 'occasion',
      occasion_label: occasionLabel,
      occasion_slug: occasionSlug,
      // NOTE: `source` is a GA4-reserved attribution param — use `click_source`
      // to avoid hijacking session source/medium (e.g. "home_occasion_row / (not set)").
      click_source: source,
    });
  },
};
