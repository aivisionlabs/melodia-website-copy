CREATE TYPE "public"."partner_api_order_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "partner_api_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"name" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_api_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"external_order_id" text NOT NULL,
	"product_type" text DEFAULT 'templated_song' NOT NULL,
	"template_id" integer,
	"templated_song_instance_id" integer,
	"recipient_name" text NOT NULL,
	"webhook_url" text,
	"status" "partner_api_order_status" DEFAULT 'pending' NOT NULL,
	"amount_charged" numeric(10, 2),
	"currency" text DEFAULT 'INR',
	"metadata" jsonb,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "partner_api_product_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"product_type" text DEFAULT 'templated_song' NOT NULL,
	"product_id" integer,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_api_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"webhook_url" text,
	"webhook_secret" text NOT NULL,
	"sandbox" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_api_vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partner_webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status_code" integer,
	"success" boolean DEFAULT false NOT NULL,
	"request_body" text,
	"response_snippet" text,
	"error_message" text,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "templated_song_instances" ADD COLUMN "partner_api_order_id" integer;--> statement-breakpoint
ALTER TABLE "partner_api_credentials" ADD CONSTRAINT "partner_api_credentials_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD CONSTRAINT "partner_api_orders_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD CONSTRAINT "partner_api_orders_template_id_templated_songs_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templated_songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_product_prices" ADD CONSTRAINT "partner_api_product_prices_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_webhook_deliveries" ADD CONSTRAINT "partner_webhook_deliveries_order_id_partner_api_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."partner_api_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_webhook_deliveries" ADD CONSTRAINT "partner_webhook_deliveries_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_api_credentials_vendor_id_idx" ON "partner_api_credentials" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "partner_api_credentials_key_hash_idx" ON "partner_api_credentials" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "partner_api_orders_vendor_id_idx" ON "partner_api_orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "partner_api_orders_status_idx" ON "partner_api_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_api_orders_vendor_idempotency_idx" ON "partner_api_orders" USING btree ("vendor_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "partner_api_orders_instance_id_idx" ON "partner_api_orders" USING btree ("templated_song_instance_id");--> statement-breakpoint
CREATE INDEX "partner_api_product_prices_vendor_idx" ON "partner_api_product_prices" USING btree ("vendor_id","product_type");--> statement-breakpoint
CREATE INDEX "partner_webhook_deliveries_order_id_idx" ON "partner_webhook_deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "partner_webhook_deliveries_vendor_id_idx" ON "partner_webhook_deliveries" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "partner_webhook_deliveries_next_retry_idx" ON "partner_webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "templated_song_instances_partner_order_idx" ON "templated_song_instances" USING btree ("partner_api_order_id");