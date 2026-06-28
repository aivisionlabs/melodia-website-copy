CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "anonymous_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"reason" text NOT NULL,
	"block_type" text DEFAULT 'temporary',
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"blocked_until" timestamp,
	"violation_count" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sequence" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lyrics_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"version" integer DEFAULT 1,
	"lyrics_edit_prompt" text,
	"generated_text" text NOT NULL,
	"song_title" text,
	"music_style" text,
	"language" text DEFAULT 'English',
	"llm_model_name" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"razorpay_event_id" text,
	"event_type" text NOT NULL,
	"payment_id" integer,
	"webhook_data" jsonb NOT NULL,
	"processed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "payment_webhooks_razorpay_event_id_unique" UNIQUE("razorpay_event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"razorpay_payment_id" text,
	"razorpay_order_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR',
	"status" text DEFAULT 'pending',
	"payment_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "payments_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"endpoint" text NOT NULL,
	"total_requests" integer DEFAULT 0,
	"blocked_requests" integer DEFAULT 0,
	"unique_ips" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"endpoint" text NOT NULL,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"violation_count" integer DEFAULT 1,
	"tier" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"requester_name" text NOT NULL,
	"recipient_details" text NOT NULL,
	"occasion" text,
	"languages" text NOT NULL,
	"mood" text[],
	"song_story" text,
	"mobile_number" text,
	"email" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"lyrics" text,
	"song_description" text,
	"timestamp_lyrics" jsonb,
	"timestamped_lyrics_variants" jsonb,
	"timestamped_lyrics_api_responses" jsonb,
	"music_style" text,
	"service_provider" text DEFAULT 'sunoapi',
	"song_requester" text,
	"prompt" text,
	"song_url" text,
	"duration" numeric(10, 2),
	"slug" text NOT NULL,
	"add_to_library" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"status" text DEFAULT 'draft',
	"categories" text[],
	"tags" text[],
	"suno_task_id" text,
	"negative_tags" text,
	"suno_variants" jsonb,
	"selected_variant" integer,
	"metadata" jsonb,
	"sequence" integer,
	"show_lyrics" boolean DEFAULT true,
	"likes_count" integer DEFAULT 0,
	"song_request_id" integer,
	"user_id" integer,
	"is_featured" boolean DEFAULT false,
	"song_url_variant_1" text,
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'processing',
	"is_featured" boolean DEFAULT false,
	"song_variants" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_api_response" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_processed" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb,
	"approved_lyrics_id" integer,
	"service_provider" text DEFAULT 'SU',
	"categories" text[],
	"tags" text[],
	"add_to_library" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"selected_variant" integer,
	"payment_id" integer,
	CONSTRAINT "user_songs_song_request_id_unique" UNIQUE("song_request_id"),
	CONSTRAINT "user_songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_number" text,
	"profile_picture" text,
	"email_verified" boolean DEFAULT false,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "song_categories_song_id_category_id_unique" ON "song_categories" USING btree ("song_id","category_id");