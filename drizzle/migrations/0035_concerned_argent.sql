ALTER TABLE "payments" RENAME COLUMN "razorpay_payment_id" TO "payment_id";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "razorpay_order_id" TO "order_id";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_razorpay_payment_id_unique";--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_id_unique" UNIQUE("payment_id");