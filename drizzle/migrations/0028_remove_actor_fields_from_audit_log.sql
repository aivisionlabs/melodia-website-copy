-- Remove actor_type and actor_id columns from audit_log_events if they exist
-- These columns are not needed in the audit log table

ALTER TABLE audit_log_events DROP COLUMN IF EXISTS actor_type;
ALTER TABLE audit_log_events DROP COLUMN IF EXISTS actor_id;

