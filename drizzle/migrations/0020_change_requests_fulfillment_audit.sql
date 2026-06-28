-- Change Requests, Fulfillment Workflow, and Audit Log
-- Safe, additive migration. Backward compatible.

-- 1) Enums (guarded)
DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM ('pending','shared','change_requested','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_priority AS ENUM ('low','medium','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE change_request_status AS ENUM ('open','in_review','actioned','resolved','declined','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_entity AS ENUM ('song_request','change_request','song');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) song_requests additive columns
ALTER TABLE song_requests
  ADD COLUMN IF NOT EXISTS fulfillment_status fulfillment_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS priority request_priority DEFAULT 'medium' NOT NULL,
  ADD COLUMN IF NOT EXISTS delivery_date timestamptz NULL,
  ADD COLUMN IF NOT EXISTS event_date date NULL,
  ADD COLUMN IF NOT EXISTS initial_requirements_text text NULL;

CREATE INDEX IF NOT EXISTS idx_song_requests_fulfillment_status ON song_requests(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_song_requests_priority ON song_requests(priority);
CREATE INDEX IF NOT EXISTS idx_song_requests_delivery_date ON song_requests(delivery_date);
CREATE INDEX IF NOT EXISTS idx_song_requests_event_date ON song_requests(event_date);
-- Note: package_id index already exists from migration 0008 (song_requests_package_id_idx)

-- Remove selected_package column if it exists (cleanup for DB discrepancies)
ALTER TABLE song_requests DROP COLUMN IF EXISTS selected_package;

-- 3) change_requests table
CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_request_id integer NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE,
  song_id integer NULL REFERENCES songs(id) ON DELETE SET NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_song_request_id ON change_requests(song_request_id);

-- 4) audit_log_events table
CREATE TABLE IF NOT EXISTS audit_log_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type audit_entity NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  before jsonb NULL,
  after jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log_events(created_at);

-- 5) Ensure package slug index for filtering
CREATE INDEX IF NOT EXISTS idx_packages_slug ON packages(slug);



