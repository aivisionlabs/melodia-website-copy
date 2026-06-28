ALTER TABLE "partner_api_orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."partner_api_order_status";--> statement-breakpoint
CREATE TYPE "public"."partner_api_order_status" AS ENUM('pending', 'form_submitted', 'lyrics_generation_inprogress', 'lyrics_ready_for_review', 'lyrics_revision_requested', 'lyrics_approved', 'song_generation_inprogress', 'completed', 'failed', 'processing');--> statement-breakpoint
ALTER TABLE "partner_api_orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."partner_api_order_status";--> statement-breakpoint
ALTER TABLE "partner_api_orders" ALTER COLUMN "status" SET DATA TYPE "public"."partner_api_order_status" USING "status"::"public"."partner_api_order_status";--> statement-breakpoint
ALTER TABLE "partner_api_orders" ALTER COLUMN "recipient_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD COLUMN "order_token" text;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD COLUMN "package_slug" text;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD COLUMN "song_request_id" integer;--> statement-breakpoint
ALTER TABLE "partner_api_vendors" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "partner_api_order_id" integer;--> statement-breakpoint
CREATE INDEX "partner_api_orders_order_token_idx" ON "partner_api_orders" USING btree ("order_token");--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD CONSTRAINT "partner_api_orders_order_token_unique" UNIQUE("order_token");--> statement-breakpoint
-- FK constraints defined here (not in schema.ts) to avoid circular reference issues
ALTER TABLE "partner_api_orders" ADD CONSTRAINT "partner_api_orders_song_request_id_song_requests_id_fk" FOREIGN KEY ("song_request_id") REFERENCES "public"."song_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_partner_api_order_id_partner_api_orders_id_fk" FOREIGN KEY ("partner_api_order_id") REFERENCES "public"."partner_api_orders"("id") ON DELETE set null ON UPDATE no action;