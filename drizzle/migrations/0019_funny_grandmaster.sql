CREATE TYPE "public"."audit_entity" AS ENUM('song_request', 'change_request', 'song');--> statement-breakpoint
CREATE TYPE "public"."change_request_status" AS ENUM('open', 'in_review', 'actioned', 'resolved', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'shared', 'change_requested', 'completed');--> statement-breakpoint
CREATE TYPE "public"."request_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TABLE "account" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "audit_log_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "audit_entity" NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"actor_type" text DEFAULT 'system' NOT NULL,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_request_id" integer NOT NULL,
	"song_id" integer,
	"requested_by" text,
	"source_channel" text,
	"title" text,
	"description" text NOT NULL,
	"status" "change_request_status" DEFAULT 'open' NOT NULL,
	"priority" "request_priority",
	"due_by" timestamp,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR',
	"description" text,
	"features" jsonb,
	"allowed_lyrics_edits" integer DEFAULT 2,
	"active" boolean DEFAULT true,
	"sequence" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partner_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer,
	"anonymous_user_id" uuid,
	"user_id" integer,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"referrer" text,
	"landing_page" text,
	"ip_address" text,
	"user_agent" text,
	"first_visit_at" timestamp DEFAULT now() NOT NULL,
	"last_visit_at" timestamp DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1,
	"converted" boolean DEFAULT false,
	"song_request_id" integer,
	"payment_id" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"slug" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"instagram_handle" text,
	"business_address" text,
	"active" boolean DEFAULT true,
	"commission_rate" numeric(5, 2),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partners_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "package_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "package_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "lyrics_edits_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "partner_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "partner_visit_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "fulfillment_status" "fulfillment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "priority" "request_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "event_date" date;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "initial_requirements_text" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "user_song_id" integer;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_visits" ADD CONSTRAINT "partner_visits_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_visits" ADD CONSTRAINT "partner_visits_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_visits" ADD CONSTRAINT "partner_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_providerAccountId_unique" ON "account" USING btree ("provider","providerAccountId");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_partner_visit_id_partner_visits_id_fk" FOREIGN KEY ("partner_visit_id") REFERENCES "public"."partner_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" DROP COLUMN "selected_package";