ALTER TABLE "payment_webhooks" RENAME COLUMN "razorpay_event_id" TO "provider_event_id";--> statement-breakpoint
ALTER TABLE "payment_webhooks" DROP CONSTRAINT "payment_webhooks_razorpay_event_id_unique";--> statement-breakpoint
ALTER TABLE "payment_webhooks" ADD CONSTRAINT "payment_webhooks_provider_event_id_unique" UNIQUE("provider_event_id");