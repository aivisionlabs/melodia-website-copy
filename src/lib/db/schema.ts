import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  uuid,
  date,
  pgEnum,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Songs table
export const songsTable = pgTable('songs', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  title: text('title').notNull(),
  lyrics: text('lyrics'),
  customer_lyrics: text('customer_lyrics'),
  song_description: text('song_description'),
  timestamp_lyrics: jsonb('timestamp_lyrics'),
  timestamped_lyrics_variants: jsonb('timestamped_lyrics_variants'), // Store lyrics for both variants
  timestamped_lyrics_api_responses: jsonb('timestamped_lyrics_api_responses'), // Store only alignedWords data from API responses
  music_style: text('music_style'),
  service_provider: text('service_provider').default('Melodia'),
  song_requester: text('song_requester'),
  prompt: text('prompt'),
  song_url: text('song_url'),
  duration: numeric('duration', { precision: 10, scale: 2 }), // Store duration with 2 decimal places for precision
  slug: text('slug').notNull().unique(),
  add_to_library: boolean('add_to_library').default(true),
  is_deleted: boolean('is_deleted').default(false),
  is_active: boolean('is_active').default(true),
  status: text('status').default('draft'),
  categories: text('categories').array(),
  tags: text('tags').array(),
  suno_task_id: text('suno_task_id'),
  negative_tags: text('negative_tags'),
  suno_variants: jsonb('suno_variants'),
  selected_variant: integer('selected_variant'),
  metadata: jsonb('metadata'),
  sequence: integer('sequence'), // Field to control display order
  show_lyrics: boolean('show_lyrics').default(true), // Field to control whether to show lyrics
  likes_count: integer('likes_count').default(0),
  play_count: integer('play_count').default(0), // Track how many times a song has been played
  // Extra columns present in all_data.sql export (kept nullable for compatibility)
  song_request_id: integer('song_request_id'),
  user_id: integer('user_id'),
  is_featured: boolean('is_featured').default(false),
  song_url_variant_1: text('song_url_variant_1'),
  download_allowed: boolean('download_allowed').default(false),
  user_song_id: integer('user_song_id'), // Reference to user_songs table when migrated from user songs
  language: text('language'), // Comma-separated values of languages for the song
}, (table) => ({
  /**
   * NOTE: Many legacy/performance indexes exist via SQL migrations (e.g. `0001_add_performance_indexes.sql`).
   * The indexes below are specifically to cover hot paths in `src/lib/db/queries/select.ts`
   * that were not previously indexed.
   */
  songsSunoTaskIdIdx: index('songs_suno_task_id_idx').on(table.suno_task_id),
  songsSongRequestIdIdx: index('songs_song_request_id_idx').on(table.song_request_id),
  songsUserSongIdIdx: index('songs_user_song_id_idx').on(table.user_song_id),
  // Supports library ordering by likes_count DESC (Postgres can scan btree indexes backwards)
  songsLibrarySortIdx: index('songs_library_sort_idx')
    .on(table.likes_count, table.sequence, table.created_at)
    .where(sql`${table.add_to_library} = true AND ${table.is_deleted} = false`),
  // Admin portal search (ILIKE '%...%') - requires pg_trgm extension
  songsTitleTrgmIdx: index('songs_title_trgm_idx').using(
    'gin',
    table.title.op('gin_trgm_ops' as any)
  ),
}));

// Categories table (canonical list with fixed order via sequence)
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  sequence: integer('sequence').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Song to Category mapping (many-to-many)
export const songCategoriesTable = pgTable('song_categories', {
  id: serial('id').primaryKey(),
  song_id: integer('song_id').notNull(),
  category_id: integer('category_id').notNull(),
}, (table) => ({
  songCategoryUnique: uniqueIndex('song_categories_song_id_category_id_unique').on(table.song_id, table.category_id),
}));

// Admin users table
export const adminUsersTable = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// ENUMS
// ============================================
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', ['pending', 'shared', 'change_requested', 'completed']);
export const requestPriorityEnum = pgEnum('request_priority', ['low', 'medium', 'high', 'urgent']);
// changeRequestStatusEnum removed - status field no longer used in change_requests table
export const auditEntityEnum = pgEnum('audit_entity', ['song_request', 'change_request', 'song']);

// ============================================
// NEW TABLES FROM MELODIA-APP
// ============================================

// Users table - Registered user accounts
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  date_of_birth: date('date_of_birth').notNull(),
  phone_number: text('phone_number'),
  profile_picture: text('profile_picture'),
  email_verified: boolean('email_verified').default(false),
  password_hash: text('password_hash'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// NEXTAUTH.JS TABLES (Required by DrizzleAdapter)
// ============================================

// Account table - OAuth accounts linked to users
export const accountTable = pgTable('account', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  providerUnique: uniqueIndex('account_provider_providerAccountId_unique').on(table.provider, table.providerAccountId),
}));

// Session table - User sessions (for database sessions, not used with JWT strategy but required by adapter)
export const sessionTable = pgTable('session', {
  id: serial('id').primaryKey(),
  sessionToken: text('sessionToken').notNull().unique(),
  userId: integer('userId').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

// Verification token table - Email verification tokens
export const verificationTokenTable = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  identifierTokenUnique: uniqueIndex('verificationToken_identifier_token_unique').on(table.identifier, table.token),
}));

// Anonymous users table - Temporary user sessions
export const anonymousUsersTable = pgTable('anonymous_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Packages table - Available packages/pricing plans
export const packagesTable = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., "Basic Package", "Premium Package"
  slug: text('slug').notNull().unique(), // e.g., "package_1", "package_2", "package_3"
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Price in INR
  currency: text('currency').default('INR'),
  description: text('description'),
  features: jsonb('features'), // Array of features included in this package
  allowed_lyrics_edits: integer('allowed_lyrics_edits').default(2), // Number of lyrics edits allowed
  allowed_variations: integer('allowed_variations').default(0).notNull(), // Number of song variations allowed
  expert_created: boolean('expert_created').default(false), // Whether package requires expert creation (TRUE for 1599, FALSE for 599/799)
  self_serve: boolean('self_serve').default(true), // Whether package is self-serve (TRUE for 599/799, FALSE for 1599)
  active: boolean('active').default(true), // Whether package is currently available
  sequence: integer('sequence').default(0), // Display order
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Partners table - Cake shops and Instagram influencers
export const partnersTable = pgTable('partners', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'cake_shop' | 'instagram_influencer'
  slug: text('slug').notNull().unique(),
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  instagram_handle: text('instagram_handle'),
  business_address: text('business_address'),
  active: boolean('active').default(true),
  commission_rate: numeric('commission_rate', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Partner visits table - UTM tracking and visit data
// Note: song_request_id and payment_id foreign keys are defined in migrations to avoid circular references
export const partnerVisitsTable = pgTable('partner_visits', {
  id: serial('id').primaryKey(),
  partner_id: integer('partner_id').references(() => partnersTable.id),
  anonymous_user_id: uuid('anonymous_user_id').references(() => anonymousUsersTable.id),
  user_id: integer('user_id').references(() => usersTable.id),
  utm_source: text('utm_source'),
  utm_medium: text('utm_medium'),
  utm_campaign: text('utm_campaign'),
  utm_content: text('utm_content'),
  utm_term: text('utm_term'),
  referrer: text('referrer'),
  landing_page: text('landing_page'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  first_visit_at: timestamp('first_visit_at').notNull().defaultNow(),
  last_visit_at: timestamp('last_visit_at').notNull().defaultNow(),
  visit_count: integer('visit_count').default(1),
  converted: boolean('converted').default(false),
  song_request_id: integer('song_request_id'), // Foreign key defined in migration
  payment_id: integer('payment_id'), // Foreign key defined in migration
  metadata: jsonb('metadata'),
});

// Song requests table - Song generation requests
export const songRequestsTable = pgTable('song_requests', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id),
  anonymous_user_id: uuid('anonymous_user_id').references(() => anonymousUsersTable.id),
  requester_name: text('requester_name'),
  recipient_details: text('recipient_details').notNull(),
  // User-confirmed recipient name in native script (e.g. Devanagari) for SUNO.
  recipient_name_in_script: text('recipient_name_in_script'),
  // Language whose native script `recipient_name_in_script` was confirmed for.
  recipient_name_script_lang: text('recipient_name_script_lang'),
  occasion: text('occasion'),
  languages: text('languages').notNull(),
  mood: text('mood').array(),
  song_story: text('song_story'),
  lyrics_input_mode: text('lyrics_input_mode').default('story').notNull(), // 'story' | 'lyrics'
  input_lyrics: text('input_lyrics'), // Raw user-entered lyrics captured at request time
  mobile_number: text('mobile_number'),
  email: text('email'),
  package_id: integer('package_id').references(() => packagesTable.id),
  // Similar-style provenance (nullable for backwards compatibility)
  source_song_id: integer('source_song_id').references(() => songsTable.id),
  persona_id: integer('persona_id').references(() => personasTable.id),
  namedrop_template_id: integer('namedrop_template_id'),
  namedrop_singalong_lyrics_enabled: boolean('namedrop_singalong_lyrics_enabled').default(true),
  request_source: text('request_source'), // e.g. 'similar_style' | 'direct'
  lyrics_edits_used: integer('lyrics_edits_used').default(0), // Track how many lyrics edits have been used
  selected_lyrics_draft_id: integer('selected_lyrics_draft_id'), // Which version is selected for song generation (foreign key defined in migration)
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  partner_id: integer('partner_id').references(() => partnersTable.id),
  partner_visit_id: integer('partner_visit_id').references(() => partnerVisitsTable.id),
  partner_api_order_id: integer('partner_api_order_id'), // FK to partner_api_orders defined in migration (avoids circular ref); signals payment is handled by partner
  fulfillment_status: fulfillmentStatusEnum('fulfillment_status').default('pending').notNull(),
  priority: requestPriorityEnum('priority').default('medium').notNull(),
  delivery_date: date('delivery_date'),
  event_date: date('event_date'),
  initial_requirements_text: text('initial_requirements_text'),
  assignee: text('assignee'), // Assignee for the song request
  // Advanced settings captured from the create form
  language_preferences: text('language_preferences'), // e.g. "70% Hindi, 30% English"
  music_style_chips: text('music_style_chips').array(), // Occasion-specific advanced genre/tempo chips
  music_style_notes: text('music_style_notes'), // Free-text additional music style notes
  parent_request_id: integer('parent_request_id'), // Set on variation requests; FK to song_requests defined in migration
  variations_used: integer('variations_used').default(0).notNull(), // How many variations have been generated from this request
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Admin portal filters
  songRequestsFulfillmentStatusIdx: index('song_requests_fulfillment_status_idx').on(table.fulfillment_status),
  songRequestsAssigneeIdx: index('song_requests_assignee_idx').on(table.assignee),
  // Admin portal search (ILIKE '%...%') - requires pg_trgm extension
  songRequestsRecipientDetailsTrgmIdx: index('song_requests_recipient_details_trgm_idx').using(
    'gin',
    table.recipient_details.op('gin_trgm_ops' as any)
  ),
  // my-songs API: filter by owner
  songRequestsUserIdIdx: index('song_requests_user_id_idx').on(table.user_id),
  songRequestsAnonymousUserIdIdx: index('song_requests_anonymous_user_id_idx').on(table.anonymous_user_id),
}));

// User songs table - Generated songs (separate from library songs)
export const userSongsTable = pgTable('user_songs', {
  id: serial('id').primaryKey(),
  song_request_id: integer('song_request_id').notNull().unique(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  slug: text('slug').notNull().unique(),
  status: text('status').default('processing'), // 'processing', 'completed', 'failed'
  is_featured: boolean('is_featured').default(false),
  song_variants: jsonb('song_variants').default({}),
  variant_timestamp_lyrics_api_response: jsonb('variant_timestamp_lyrics_api_response').default({}),
  variant_timestamp_lyrics_processed: jsonb('variant_timestamp_lyrics_processed').default({}),
  metadata: jsonb('metadata'),
  approved_lyrics_id: integer('approved_lyrics_id'),
  service_provider: text('service_provider').default('SU'), // 'SU' for Suno
  categories: text('categories').array(),
  tags: text('tags').array(),
  add_to_library: boolean('add_to_library').default(false),
  is_deleted: boolean('is_deleted').default(false),
  payment_id: integer('payment_id'),
});

// Per-variant reviews/feedback table (append-only)
export const userSongVariantReviewsTable = pgTable('user_song_variant_reviews', {
  id: serial('id').primaryKey(),
  song_id: integer('song_id').notNull(),
  variant_index: integer('variant_index').notNull(),
  accepted: boolean('accepted').notNull().default(false),
  reason_codes: text('reason_codes').array(),
  other_text: text('other_text'),
  positive_aspects: text('positive_aspects').array(),
  positive_other_text: text('positive_other_text'),
  rating: integer('rating'), // 1..5
  created_by_user_id: integer('created_by_user_id'),
  anonymous_user_id: uuid('anonymous_user_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Used by admin queries to fetch reviews for a set of song IDs
  userSongVariantReviewsSongIdIdx: index('user_song_variant_reviews_song_id_idx').on(table.song_id),
  userSongVariantReviewsSongIdCreatedAtIdx: index('user_song_variant_reviews_song_id_created_at_idx').on(table.song_id, table.created_at),
}));

// Canonical list of feedback reasons (dynamic)
export const songFeedbackReasonsTable = pgTable('song_feedback_reasons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  active: boolean('active').notNull().default(true),
  sequence: integer('sequence').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  songFeedbackReasonsActiveIdx: index('song_feedback_reasons_active_idx').on(table.active),
}));

// Lyrics drafts table - Generated lyrics with versioning
export const lyricsDraftsTable = pgTable('lyrics_drafts', {
  id: serial('id').primaryKey(),
  song_request_id: integer('song_request_id').notNull(),
  version: integer('version').default(1),
  original_version_id: integer('original_version_id'), // Reference to original version this was derived from (self-reference defined via migration)
  lyrics_edit_prompt: text('lyrics_edit_prompt'),
  // customer_lyrics: Romanized/transliterated display lyrics shown to users; directly output by the LLM; what users read and edit
  customer_lyrics: text('customer_lyrics'),
  // model_ready_lyrics: Audio-model-ready lyrics with names/text in native script and proper structure;
  // populated only at approval time via the audio-model lyrics crafter; what is sent to the audio provider.
  // Renamed from generated_text (was previously SUNO-ready output produced upfront).
  model_ready_lyrics: text('model_ready_lyrics'),
  song_title: text('song_title'),
  music_style: text('music_style'),
  description: text('description'),
  language: text('language').default('English'),
  llm_model_name: text('llm_model_name'),
  song_requirements: jsonb('song_requirements'), // Cached SongRequirements from context analysis (avoids re-running LLM)
  status: text('status').default('draft'), // 'draft', 'needs_review', 'approved', 'archived'
  custom_lyrics: boolean('custom_lyrics').default(false), // Flag to indicate if lyrics were user-provided
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Speeds up "latest version per song_request_id" access patterns
  lyricsDraftsSongRequestIdVersionIdx: index('lyrics_drafts_song_request_id_version_idx').on(table.song_request_id, table.version),
}));

// Lyrics draft reviews table - compact review report (keep lyrics_drafts lean)
export const lyricsDraftReviewsTable = pgTable('lyrics_draft_reviews', {
  id: serial('id').primaryKey(),
  lyrics_draft_id: integer('lyrics_draft_id')
    .notNull()
    .references(() => lyricsDraftsTable.id, { onDelete: 'cascade' }),
  review_report: jsonb('review_report'), // Compact report: scores, flags, applied edits (no chain-of-thought)
  review_model_name: text('review_model_name'),
  reviewed_at: timestamp('reviewed_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  lyricsDraftReviewsDraftIdUnique: uniqueIndex('lyrics_draft_reviews_lyrics_draft_id_unique').on(table.lyrics_draft_id),
  lyricsDraftReviewsDraftIdIdx: index('lyrics_draft_reviews_lyrics_draft_id_idx').on(table.lyrics_draft_id),
}));

// LLM pipeline step outputs - audit trail of each LLM step per song request (for analysis/debugging)
// One row per step execution; link to song_request always, optionally to lyrics_draft and pipeline_run_id.
export const llmPipelineStepOutputsTable = pgTable(
  'llm_pipeline_step_outputs',
  {
    id: serial('id').primaryKey(),
    song_request_id: integer('song_request_id')
      .notNull()
      .references(() => songRequestsTable.id, { onDelete: 'cascade' }),
    lyrics_draft_id: integer('lyrics_draft_id').references(() => lyricsDraftsTable.id, { onDelete: 'set null' }),
    pipeline_run_id: uuid('pipeline_run_id'), // Groups steps from the same API call (e.g. one generate-lyrics run)
    step_name: text('step_name').notNull(), // context_analysis | lyrics_generation | music_style | lyrics_review | transliteration | custom_lyrics_processing | custom_lyrics_suno_structure | refine_lyrics | regenerate_music_style | update_music_style
    step_order: integer('step_order'), // Order within the run
    input_summary: jsonb('input_summary'), // Optional small snapshot (e.g. form keys); avoid storing full lyrics
    output_snapshot: jsonb('output_snapshot').notNull(), // Step-specific output (SongRequirements, { title, lyrics }, { musicStyle }, etc.)
    model_name: text('model_name'),
    duration_ms: integer('duration_ms'),
    success: boolean('success').notNull().default(true),
    error_message: text('error_message'),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    llmPipelineStepOutputsSongRequestIdIdx: index('llm_pipeline_step_outputs_song_request_id_idx').on(table.song_request_id),
    llmPipelineStepOutputsStepNameIdx: index('llm_pipeline_step_outputs_step_name_idx').on(table.step_name),
    llmPipelineStepOutputsCreatedAtIdx: index('llm_pipeline_step_outputs_created_at_idx').on(table.created_at),
    llmPipelineStepOutputsPipelineRunIdIdx: index('llm_pipeline_step_outputs_pipeline_run_id_idx').on(table.pipeline_run_id),
    llmPipelineStepOutputsLyricsDraftIdIdx: index('llm_pipeline_step_outputs_lyrics_draft_id_idx').on(table.lyrics_draft_id),
  })
);

// Payments table - Payment records
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  song_request_id: integer('song_request_id'),
  package_id: integer('package_id').references(() => packagesTable.id),
  user_id: integer('user_id'),
  anonymous_user_id: uuid('anonymous_user_id'),
  payment_id: text('payment_id').unique(),
  order_id: text('order_id'),
  payment_provider: text('payment_provider').default('razorpay'), // 'razorpay' | 'cashfree'
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  status: text('status').default('pending'), // 'pending', 'completed', 'failed', 'refunded'
  payment_method: text('payment_method'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => ({
  // Speeds up EXISTS() checks like: payments where song_request_id = ? and status = ?
  paymentsSongRequestIdStatusIdx: index('payments_song_request_id_status_idx').on(table.song_request_id, table.status),
}));

// Payment webhooks table - Payment webhook logs (provider-agnostic)
export const paymentWebhooksTable = pgTable('payment_webhooks', {
  id: serial('id').primaryKey(),
  provider_event_id: text('provider_event_id').unique(),
  event_type: text('event_type').notNull(),
  payment_id: integer('payment_id'),
  webhook_data: jsonb('webhook_data').notNull(),
  processed: boolean('processed').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  processed_at: timestamp('processed_at'),
});

// Email verification codes table - Email OTP codes
export const emailVerificationCodesTable = pgTable('email_verification_codes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  attempts: integer('attempts').default(0),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Rate limit violations table - Rate limit tracking
export const rateLimitViolationsTable = pgTable('rate_limit_violations', {
  id: serial('id').primaryKey(),
  ip_address: text('ip_address').notNull(),
  endpoint: text('endpoint').notNull(),
  user_id: integer('user_id'),
  anonymous_user_id: uuid('anonymous_user_id'),
  violation_count: integer('violation_count').default(1),
  tier: text('tier').notNull(), // 'low', 'medium', 'high', 'critical'
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Blocked IPs table - IP blocking
export const blockedIpsTable = pgTable('blocked_ips', {
  id: serial('id').primaryKey(),
  ip_address: text('ip_address').notNull().unique(),
  reason: text('reason').notNull(),
  block_type: text('block_type').default('temporary'), // 'temporary', 'permanent'
  blocked_at: timestamp('blocked_at').notNull().defaultNow(),
  blocked_until: timestamp('blocked_until'),
  violation_count: integer('violation_count').default(0),
  last_attempt_at: timestamp('last_attempt_at'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Rate limit analytics table - Analytics
export const rateLimitAnalyticsTable = pgTable('rate_limit_analytics', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  endpoint: text('endpoint').notNull(),
  total_requests: integer('total_requests').default(0),
  blocked_requests: integer('blocked_requests').default(0),
  unique_ips: integer('unique_ips').default(0),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Change requests table - Customer change requests for songs
export const changeRequestsTable = pgTable('change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  song_request_id: integer('song_request_id').notNull().references(() => songRequestsTable.id, { onDelete: 'cascade' }),
  song_id: integer('song_id').references(() => songsTable.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Song request songs junction table - Many-to-many relationship between song requests and songs
export const songRequestSongsTable = pgTable('song_request_songs', {
  id: serial('id').primaryKey(),
  song_request_id: integer('song_request_id').notNull().references(() => songRequestsTable.id, { onDelete: 'cascade' }),
  song_id: integer('song_id').notNull().references(() => songsTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate links
  uniqueRequestSong: unique().on(table.song_request_id, table.song_id),
}));

// Audit log events table - Audit trail for all entity changes
export const auditLogEventsTable = pgTable('audit_log_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity_type: auditEntityEnum('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  action: text('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// PERSONAS
// ============================================

export const personasTable = pgTable('personas', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  suno_persona_id: text('suno_persona_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  source_task_id: text('source_task_id'),
  source_audio_id: text('source_audio_id'),
  variant_index: integer('variant_index'),
});

export const personaAssociationsTable = pgTable('persona_associations', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  persona_id: integer('persona_id').notNull().references(() => personasTable.id, { onDelete: 'cascade' }),
  song_id: integer('song_id').references(() => songsTable.id, { onDelete: 'cascade' }),
  user_song_id: integer('user_song_id').references(() => userSongsTable.id, { onDelete: 'cascade' }),
}, (table) => ({
  personaSongUnique: uniqueIndex('persona_song_unique').on(table.persona_id, table.song_id),
  personaUserSongUnique: uniqueIndex('persona_user_song_unique').on(table.persona_id, table.user_song_id),
  // Used by `EXISTS (...) WHERE pa.song_id = songs.id` checks
  personaAssociationsSongIdIdx: index('persona_associations_song_id_idx').on(table.song_id),
  personaAssociationsUserSongIdIdx: index('persona_associations_user_song_id_idx').on(table.user_song_id),
}));

// ============================================
// TEMPLATED SONGS (admin-created templates, user instances)
// ============================================

export const templatedPromotionTagEnum = pgEnum('templated_promotion_tag', [
  'trending',
  'most_preferred',
  'new',
]);

/** Templated songs: admin-created templates with processed lyrics ({{NAME}}), persona, and template song variants. */
export const templatedSongsTable = pgTable('templated_songs', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  title: text('title').notNull(),
  template_title: text('template_title'), // Processed title with {{NAME}}; set after admin "Process Lyrics" (e.g. "Birthday Song for {{NAME}}")
  template_lyrics: text('template_lyrics'), // Processed lyrics with {{NAME}}; set after admin "Process Lyrics"
  draft_lyrics: text('draft_lyrics'), // Raw lyrics (e.g. with "Alex") before Process Lyrics
  persona_id: integer('persona_id').references(() => personasTable.id),
  music_style: text('music_style'),
  display_order: integer('display_order').default(0),
  is_active: boolean('is_active').default(true),
  first_activated_at: timestamp('first_activated_at'),
  slug: text('slug').notNull().unique(),
  suno_task_id: text('suno_task_id'),
  song_variants: jsonb('song_variants'),
  selected_variant: integer('selected_variant'),
  template_timestamp_lyrics: jsonb('template_timestamp_lyrics'), // Processed timestamp lyrics for selected variant with {{NAME}}
  language: text('language').default('English'), // Primary language of the template (e.g. English, Hindi)
  description: text('description'), // Describes who this template suits best (e.g. "Perfect for kids' birthday parties")
  is_namedrop_eligible: boolean('is_namedrop_eligible').notNull().default(false),
  tags: text('tags').array().notNull().default([]),
}, (table) => ({
  templatedSongsDisplayOrderIdx: index('templated_songs_display_order_idx').on(table.display_order),
  templatedSongsIsActiveIdx: index('templated_songs_is_active_idx').on(table.is_active),
  templatedSongsNamedropIdx: index('templated_songs_namedrop_idx').on(table.is_namedrop_eligible),
}));

/** Instances generated from templated songs (separate from user_songs). */
export const templatedSongInstancesTable = pgTable('templated_song_instances', {
  id: serial('id').primaryKey(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  template_id: integer('template_id').notNull().references(() => templatedSongsTable.id, { onDelete: 'cascade' }),
  recipient_name: text('recipient_name').notNull(),
  replaced_lyrics: text('replaced_lyrics').notNull(),
  song_title: text('song_title').notNull(),
  persona_id: integer('persona_id').references(() => personasTable.id),
  suno_task_id: text('suno_task_id'),
  status: text('status').default('processing'),
  slug: text('slug').notNull().unique(),
  song_variants: jsonb('song_variants').default({}),
  variant_timestamp_lyrics_api_response: jsonb('variant_timestamp_lyrics_api_response').default({}),
  variant_timestamp_lyrics_processed: jsonb('variant_timestamp_lyrics_processed').default({}),
  user_id: integer('user_id').references(() => usersTable.id),
  anonymous_user_id: uuid('anonymous_user_id').references(() => anonymousUsersTable.id),
  metadata: jsonb('metadata'),
  singalong_lyrics_enabled: boolean('singalong_lyrics_enabled').default(true).notNull(),
  partner_api_order_id: integer('partner_api_order_id'),
}, (table) => ({
  templatedSongInstancesTemplateIdIdx: index('templated_song_instances_template_id_idx').on(table.template_id),
  templatedSongInstancesSunoTaskIdIdx: index('templated_song_instances_suno_task_id_idx').on(table.suno_task_id),
  templatedSongInstancesStatusIdx: index('templated_song_instances_status_idx').on(table.status),
  templatedSongInstancesPartnerOrderIdx: index('templated_song_instances_partner_order_idx').on(table.partner_api_order_id),
  // my-songs API: filter by owner
  templatedSongInstancesUserIdIdx: index('templated_song_instances_user_id_idx').on(table.user_id),
  templatedSongInstancesAnonymousUserIdIdx: index('templated_song_instances_anonymous_user_id_idx').on(table.anonymous_user_id),
}));

/** Templated song to category mapping (many-to-many). */
export const templatedSongCategoriesTable = pgTable(
  'templated_song_categories',
  {
    id: serial('id').primaryKey(),
    templated_song_id: integer('templated_song_id')
      .notNull()
      .references(() => templatedSongsTable.id, { onDelete: 'cascade' }),
    category_id: integer('category_id')
      .notNull()
      .references(() => categoriesTable.id, { onDelete: 'cascade' }),
    display_order: integer('display_order').default(0).notNull(),
    promotion_tag: templatedPromotionTagEnum('promotion_tag'),
    suppress_auto_new: boolean('suppress_auto_new').default(false).notNull(),
  },
  (table) => ({
    templatedSongCategoryUnique: uniqueIndex(
      'templated_song_categories_templated_song_id_category_id_unique'
    ).on(table.templated_song_id, table.category_id),
    templatedSongCategoriesTemplatedSongIdIdx: index(
      'templated_song_categories_templated_song_id_idx'
    ).on(table.templated_song_id),
    templatedSongCategoriesCategoryIdIdx: index(
      'templated_song_categories_category_id_idx'
    ).on(table.category_id),
  })
);

export const templatedFeedbackEventTypeEnum = pgEnum(
  'templated_feedback_event_type',
  ['variant_listened', 'variant_rated', 'variant_decision']
);

export const templatedFeedbackDecisionEnum = pgEnum(
  'templated_feedback_decision',
  ['liked', 'disliked']
);

/** Append-only feedback events for templated song variants (2-variant evaluation flow). */
export const templatedInstanceFeedbackEventsTable = pgTable(
  'templated_instance_feedback_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templated_song_instance_id: integer('templated_song_instance_id')
      .notNull()
      .references(() => templatedSongInstancesTable.id, { onDelete: 'cascade' }),
    variant_index: smallint('variant_index').notNull(),
    event_type: templatedFeedbackEventTypeEnum('event_type').notNull(),
    decision: templatedFeedbackDecisionEnum('decision'),
    rating: smallint('rating'),
    reason_codes: text('reason_codes').array(),
    other_text: text('other_text'),
    positive_aspects: text('positive_aspects').array(),
    positive_other_text: text('positive_other_text'),
    user_id: integer('user_id').references(() => usersTable.id),
    anonymous_user_id: uuid('anonymous_user_id').references(
      () => anonymousUsersTable.id
    ),
    partner_api_order_id: integer('partner_api_order_id'),
    client_session_id: text('client_session_id'),
    request_id: text('request_id'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    templatedFeedbackEventsInstanceIdx: index(
      'templated_feedback_events_instance_idx'
    ).on(table.templated_song_instance_id),
    templatedFeedbackEventsInstanceVariantCreatedAtIdx: index(
      'templated_feedback_events_instance_variant_created_at_idx'
    ).on(table.templated_song_instance_id, table.variant_index, table.created_at),
    templatedFeedbackEventsActorCheck: check(
      'templated_feedback_events_actor_check',
      sql`${table.user_id} IS NOT NULL OR ${table.anonymous_user_id} IS NOT NULL OR ${table.partner_api_order_id} IS NOT NULL`
    ),
    templatedFeedbackEventsVariantCheck: check(
      'templated_feedback_events_variant_check',
      sql`${table.variant_index} IN (0, 1)`
    ),
    templatedFeedbackEventsRatingCheck: check(
      'templated_feedback_events_rating_check',
      sql`${table.rating} IS NULL OR (${table.rating} >= 1 AND ${table.rating} <= 5)`
    ),
  })
);

// ============================================
// PARTNER API (B2B)
// ============================================

export const partnerApiVendorsTable = pgTable('partner_api_vendors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo_url: text('logo_url'),
  webhook_url: text('webhook_url'),
  webhook_secret: text('webhook_secret').notNull(),
  invoice_legal_entity_name: text('invoice_legal_entity_name'),
  invoice_address: text('invoice_address'),
  invoice_gst_number: text('invoice_gst_number'),
  invoice_mobile: text('invoice_mobile'),
  sandbox: boolean('sandbox').default(false).notNull(),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const partnerApiCredentialsTable = pgTable('partner_api_credentials', {
  id: serial('id').primaryKey(),
  vendor_id: integer('vendor_id').notNull().references(() => partnerApiVendorsTable.id, { onDelete: 'cascade' }),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  name: text('name').notNull(),
  last_used_at: timestamp('last_used_at'),
  expires_at: timestamp('expires_at'),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partnerApiCredentialsVendorIdIdx: index('partner_api_credentials_vendor_id_idx').on(table.vendor_id),
  partnerApiCredentialsKeyHashIdx: index('partner_api_credentials_key_hash_idx').on(table.key_hash),
}));

export const partnerApiOrderStatusEnum = pgEnum('partner_api_order_status', [
  'pending',                       // order created, customer hasn't filled the form yet
  'form_submitted',                // customer submitted song details, lyrics generation not started
  'lyrics_generation_inprogress',  // LLM is generating lyrics
  'lyrics_ready_for_review',       // lyrics ready, awaiting customer approval
  'lyrics_revision_requested',     // customer requested AI revision of lyrics
  'lyrics_approved',               // customer approved lyrics, song generation queued
  'song_generation_inprogress',    // Suno generating audio variants
  'completed',                     // song ready, customer can listen/download
  'failed',                        // terminal failure at any stage
  // Legacy: some rows still use `processing` from older flows
  'processing',
]);

export const partnerApiOrdersTable = pgTable('partner_api_orders', {
  id: serial('id').primaryKey(),
  vendor_id: integer('vendor_id').notNull().references(() => partnerApiVendorsTable.id),
  external_order_id: text('external_order_id').notNull(),
  product_type: text('product_type').notNull().default('customer_templated_song'),
  template_id: integer('template_id').references(() => templatedSongsTable.id),
  recipient_name: text('recipient_name'), // nullable — e.g. customer_custom_song may collect later in the flow
  // Co-branded / customer flow fields
  order_token: text('order_token').unique(), // UUID used as the customer-facing URL token
  customer_name: text('customer_name'),      // optional pre-fill provided by partner at order creation
  customer_mobile: text('customer_mobile'),  // optional customer phone (partner-supplied)
  occasion: text('occasion'),                // optional occasion pre-set for customer_templated_song orders
  package_slug: text('package_slug'),        // package tier chosen by partner (e.g. 'package_1')
  song_request_id: integer('song_request_id'), // set once customer submits the form (FK defined in migration)
  webhook_url: text('webhook_url'),
  status: partnerApiOrderStatusEnum('status').default('pending').notNull(),
  amount_charged: numeric('amount_charged', { precision: 10, scale: 2 }),
  currency: text('currency').default('INR'),
  metadata: jsonb('metadata'),
  idempotency_key: text('idempotency_key'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
  is_test_order: boolean('is_test_order').default(false).notNull(),
}, (table) => ({
  partnerApiOrdersVendorIdIdx: index('partner_api_orders_vendor_id_idx').on(table.vendor_id),
  partnerApiOrdersStatusIdx: index('partner_api_orders_status_idx').on(table.status),
  partnerApiOrdersIdempotencyIdx: uniqueIndex('partner_api_orders_vendor_idempotency_idx').on(table.vendor_id, table.idempotency_key),
  partnerApiOrdersOrderTokenIdx: index('partner_api_orders_order_token_idx').on(table.order_token),
  partnerApiOrdersVendorTestIdx: index('partner_api_orders_vendor_test_idx').on(table.vendor_id, table.is_test_order),
}));

export const partnerApiInvoicePricingModelEnum = pgEnum('partner_api_invoice_pricing_model', [
  'flat_unit',
  'rj_show_composite',
]);

export const partnerApiInvoiceStatusEnum = pgEnum('partner_api_invoice_status', ['issued']);

export const partnerApiInvoicesTable = pgTable('partner_api_invoices', {
  id: serial('id').primaryKey(),
  vendor_id: integer('vendor_id').notNull().references(() => partnerApiVendorsTable.id),
  invoice_number: text('invoice_number').notNull().unique(),
  product_type: text('product_type').notNull(),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  currency: text('currency').default('INR').notNull(),
  pricing_model: partnerApiInvoicePricingModelEnum('pricing_model').notNull(),
  pricing_defaults: jsonb('pricing_defaults').notNull(),
  billable_quantity: integer('billable_quantity').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  status: partnerApiInvoiceStatusEnum('status').default('issued').notNull(),
  pdf_storage_key: text('pdf_storage_key'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partnerApiInvoicesVendorIdIdx: index('partner_api_invoices_vendor_id_idx').on(table.vendor_id),
  partnerApiInvoicesProductTypeIdx: index('partner_api_invoices_product_type_idx').on(table.product_type),
  partnerApiInvoicesCreatedAtIdx: index('partner_api_invoices_created_at_idx').on(table.created_at),
}));

export const partnerApiInvoiceLineItemsTable = pgTable('partner_api_invoice_line_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id')
    .notNull()
    .references(() => partnerApiInvoicesTable.id, { onDelete: 'cascade' }),
  order_id: integer('order_id')
    .notNull()
    .unique()
    .references(() => partnerApiOrdersTable.id),
  line_amount: numeric('line_amount', { precision: 12, scale: 2 }).notNull(),
  pricing_breakdown: jsonb('pricing_breakdown').notNull(),
  external_order_id: text('external_order_id').notNull(),
  recipient_name: text('recipient_name'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partnerApiInvoiceLineItemsInvoiceIdIdx: index('partner_api_invoice_line_items_invoice_id_idx').on(
    table.invoice_id,
  ),
}));

export const partnerApiProductPricesTable = pgTable('partner_api_product_prices', {
  id: serial('id').primaryKey(),
  vendor_id: integer('vendor_id').notNull().references(() => partnerApiVendorsTable.id, { onDelete: 'cascade' }),
  product_type: text('product_type').notNull().default('customer_templated_song'),
  product_id: integer('product_id'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  partnerApiProductPricesVendorIdx: index('partner_api_product_prices_vendor_idx').on(table.vendor_id, table.product_type),
}));

export const partnerWebhookDeliveriesTable = pgTable('partner_webhook_deliveries', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => partnerApiOrdersTable.id),
  vendor_id: integer('vendor_id').notNull().references(() => partnerApiVendorsTable.id),
  attempt: integer('attempt').notNull().default(1),
  status_code: integer('status_code'),
  success: boolean('success').default(false).notNull(),
  request_body: text('request_body'),
  response_snippet: text('response_snippet'),
  error_message: text('error_message'),
  next_retry_at: timestamp('next_retry_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partnerWebhookDeliveriesOrderIdIdx: index('partner_webhook_deliveries_order_id_idx').on(table.order_id),
  partnerWebhookDeliveriesVendorIdIdx: index('partner_webhook_deliveries_vendor_id_idx').on(table.vendor_id),
  partnerWebhookDeliveriesNextRetryIdx: index('partner_webhook_deliveries_next_retry_idx').on(table.next_retry_at),
}));

// ============================================
// BLOG POSTS (SEO)
// ============================================

export const blogPostsTable = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  meta_description: text('meta_description'),
  content: text('content').notNull(), // HTML content with H1, H2, H3, etc.
  category: text('category').notNull().default('general'),
  published: boolean('published').default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  blogPostsSlugIdx: index('blog_posts_slug_idx').on(table.slug),
  blogPostsPublishedIdx: index('blog_posts_published_idx').on(table.published),
  blogPostsCategoryIdx: index('blog_posts_category_idx').on(table.category),
}));

// ============================================
// TYPES - Existing
// ============================================
export type InsertSong = typeof songsTable.$inferInsert;
export type SelectSong = typeof songsTable.$inferSelect;

export type InsertCategory = typeof categoriesTable.$inferInsert;
export type SelectCategory = typeof categoriesTable.$inferSelect;

export type InsertAdminUser = typeof adminUsersTable.$inferInsert;
export type SelectAdminUser = typeof adminUsersTable.$inferSelect;

// ============================================
// TYPES - New Tables
// ============================================
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertAnonymousUser = typeof anonymousUsersTable.$inferInsert;
export type SelectAnonymousUser = typeof anonymousUsersTable.$inferSelect;

export type InsertSongRequest = typeof songRequestsTable.$inferInsert;
export type SelectSongRequest = typeof songRequestsTable.$inferSelect;

export type InsertUserSong = typeof userSongsTable.$inferInsert;
export type SelectUserSong = typeof userSongsTable.$inferSelect;

export type InsertLyricsDraft = typeof lyricsDraftsTable.$inferInsert;
export type SelectLyricsDraft = typeof lyricsDraftsTable.$inferSelect;

export type InsertLyricsDraftReview = typeof lyricsDraftReviewsTable.$inferInsert;
export type SelectLyricsDraftReview = typeof lyricsDraftReviewsTable.$inferSelect;

export type InsertLlmPipelineStepOutput = typeof llmPipelineStepOutputsTable.$inferInsert;
export type SelectLlmPipelineStepOutput = typeof llmPipelineStepOutputsTable.$inferSelect;

export type InsertPayment = typeof paymentsTable.$inferInsert;
export type SelectPayment = typeof paymentsTable.$inferSelect;

export type InsertPaymentWebhook = typeof paymentWebhooksTable.$inferInsert;
export type SelectPaymentWebhook = typeof paymentWebhooksTable.$inferSelect;

export type InsertEmailVerificationCode = typeof emailVerificationCodesTable.$inferInsert;
export type SelectEmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;

export type InsertRateLimitViolation = typeof rateLimitViolationsTable.$inferInsert;
export type SelectRateLimitViolation = typeof rateLimitViolationsTable.$inferSelect;

export type InsertBlockedIp = typeof blockedIpsTable.$inferInsert;
export type SelectBlockedIp = typeof blockedIpsTable.$inferSelect;

export type InsertRateLimitAnalytics = typeof rateLimitAnalyticsTable.$inferInsert;
export type SelectRateLimitAnalytics = typeof rateLimitAnalyticsTable.$inferSelect;

export type InsertSongFeedbackReason = typeof songFeedbackReasonsTable.$inferInsert;
export type SelectSongFeedbackReason = typeof songFeedbackReasonsTable.$inferSelect;

export type InsertUserSongVariantReview = typeof userSongVariantReviewsTable.$inferInsert;
export type SelectUserSongVariantReview = typeof userSongVariantReviewsTable.$inferSelect;

export type InsertPartner = typeof partnersTable.$inferInsert;
export type SelectPartner = typeof partnersTable.$inferSelect;

export type InsertSongRequestSong = typeof songRequestSongsTable.$inferInsert;
export type SelectSongRequestSong = typeof songRequestSongsTable.$inferSelect;

export type InsertPartnerVisit = typeof partnerVisitsTable.$inferInsert;
export type SelectPartnerVisit = typeof partnerVisitsTable.$inferSelect;

export type InsertChangeRequest = typeof changeRequestsTable.$inferInsert;
export type SelectChangeRequest = typeof changeRequestsTable.$inferSelect;

export type InsertAuditLogEvent = typeof auditLogEventsTable.$inferInsert;
export type SelectAuditLogEvent = typeof auditLogEventsTable.$inferSelect;

export type InsertPersona = typeof personasTable.$inferInsert;
export type SelectPersona = typeof personasTable.$inferSelect;
export type InsertPersonaAssociation = typeof personaAssociationsTable.$inferInsert;
export type SelectPersonaAssociation = typeof personaAssociationsTable.$inferSelect;

export type InsertTemplatedSong = typeof templatedSongsTable.$inferInsert;
export type SelectTemplatedSong = typeof templatedSongsTable.$inferSelect;
export type InsertTemplatedSongInstance = typeof templatedSongInstancesTable.$inferInsert;
export type SelectTemplatedSongInstance = typeof templatedSongInstancesTable.$inferSelect;
export type InsertTemplatedSongCategory = typeof templatedSongCategoriesTable.$inferInsert;
export type SelectTemplatedSongCategory = typeof templatedSongCategoriesTable.$inferSelect;
export type InsertTemplatedInstanceFeedbackEvent =
  typeof templatedInstanceFeedbackEventsTable.$inferInsert;
export type SelectTemplatedInstanceFeedbackEvent =
  typeof templatedInstanceFeedbackEventsTable.$inferSelect;

export type InsertBlogPost = typeof blogPostsTable.$inferInsert;
export type SelectBlogPost = typeof blogPostsTable.$inferSelect;

export type InsertPartnerApiVendor = typeof partnerApiVendorsTable.$inferInsert;
export type SelectPartnerApiVendor = typeof partnerApiVendorsTable.$inferSelect;
export type InsertPartnerApiCredential = typeof partnerApiCredentialsTable.$inferInsert;
export type SelectPartnerApiCredential = typeof partnerApiCredentialsTable.$inferSelect;
export type InsertPartnerApiOrder = typeof partnerApiOrdersTable.$inferInsert;
export type SelectPartnerApiOrder = typeof partnerApiOrdersTable.$inferSelect;
export type InsertPartnerApiProductPrice = typeof partnerApiProductPricesTable.$inferInsert;
export type SelectPartnerApiProductPrice = typeof partnerApiProductPricesTable.$inferSelect;
export type InsertPartnerApiInvoice = typeof partnerApiInvoicesTable.$inferInsert;
export type SelectPartnerApiInvoice = typeof partnerApiInvoicesTable.$inferSelect;
export type InsertPartnerApiInvoiceLineItem = typeof partnerApiInvoiceLineItemsTable.$inferInsert;
export type SelectPartnerApiInvoiceLineItem = typeof partnerApiInvoiceLineItemsTable.$inferSelect;
export type InsertPartnerWebhookDelivery = typeof partnerWebhookDeliveriesTable.$inferInsert;
export type SelectPartnerWebhookDelivery = typeof partnerWebhookDeliveriesTable.$inferSelect;

// Application logs table - for 7-30 day log retention
export const applicationLogsTable = pgTable('application_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  level: text('level').notNull(), // debug, info, warn, error, fatal
  message: text('message').notNull(),
  context: jsonb('context'), // Additional context data
  user_id: integer('user_id'),
  request_id: text('request_id'),
  api_name: text('api_name'),
  environment: text('environment'), // development, staging, production
  app_name: text('app_name').default('melodia'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export type InsertApplicationLog = typeof applicationLogsTable.$inferInsert;
export type SelectApplicationLog = typeof applicationLogsTable.$inferSelect;
