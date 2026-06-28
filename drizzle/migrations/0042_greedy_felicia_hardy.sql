CREATE TABLE "application_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"user_id" integer,
	"request_id" text,
	"api_name" text,
	"environment" text,
	"app_name" text DEFAULT 'melodia',
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
-- Create indexes for fast queries
CREATE INDEX idx_logs_timestamp ON application_logs(timestamp DESC);--> statement-breakpoint
CREATE INDEX idx_logs_level ON application_logs(level);--> statement-breakpoint
CREATE INDEX idx_logs_user_id ON application_logs(user_id) WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX idx_logs_request_id ON application_logs(request_id) WHERE request_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX idx_logs_api_name ON application_logs(api_name) WHERE api_name IS NOT NULL;--> statement-breakpoint
CREATE INDEX idx_logs_created_at ON application_logs(created_at DESC);--> statement-breakpoint
-- Full-text search index on message
CREATE INDEX idx_logs_message_fts ON application_logs USING gin(to_tsvector('english', message));--> statement-breakpoint
-- GIN index on context JSONB for fast querying
CREATE INDEX idx_logs_context_gin ON application_logs USING gin(context);
