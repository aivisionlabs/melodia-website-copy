CREATE TYPE "public"."partner_api_invoice_pricing_model" AS ENUM('flat_unit', 'rj_show_composite');--> statement-breakpoint
CREATE TYPE "public"."partner_api_invoice_status" AS ENUM('issued');--> statement-breakpoint
CREATE TABLE "partner_api_invoice_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"line_amount" numeric(12, 2) NOT NULL,
	"pricing_breakdown" jsonb NOT NULL,
	"external_order_id" text NOT NULL,
	"recipient_name" text,
	"completed_at" timestamp,
	"rj_show_id" integer,
	"paragraphs" integer,
	"revision_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_api_invoice_line_items_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "partner_api_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"product_type" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"pricing_model" "partner_api_invoice_pricing_model" NOT NULL,
	"pricing_defaults" jsonb NOT NULL,
	"billable_quantity" integer NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"notes" text,
	"status" "partner_api_invoice_status" DEFAULT 'issued' NOT NULL,
	"pdf_storage_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_api_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
ALTER TABLE "partner_api_orders" ADD COLUMN "is_test_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_api_invoice_line_items" ADD CONSTRAINT "partner_api_invoice_line_items_invoice_id_partner_api_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."partner_api_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_invoice_line_items" ADD CONSTRAINT "partner_api_invoice_line_items_order_id_partner_api_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."partner_api_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_invoice_line_items" ADD CONSTRAINT "partner_api_invoice_line_items_rj_show_id_rj_shows_id_fk" FOREIGN KEY ("rj_show_id") REFERENCES "public"."rj_shows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_api_invoices" ADD CONSTRAINT "partner_api_invoices_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_api_invoice_line_items_invoice_id_idx" ON "partner_api_invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "partner_api_invoices_vendor_id_idx" ON "partner_api_invoices" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "partner_api_invoices_product_type_idx" ON "partner_api_invoices" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "partner_api_invoices_created_at_idx" ON "partner_api_invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "partner_api_orders_vendor_test_idx" ON "partner_api_orders" USING btree ("vendor_id","is_test_order");