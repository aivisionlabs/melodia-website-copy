-- Change delivery_date column from timestamptz to date type
-- This aligns delivery_date with event_date to store only dates without time

-- First, convert existing timestamptz values to date (if any exist)
-- This will truncate the time portion and keep only the date
ALTER TABLE song_requests
  ALTER COLUMN delivery_date TYPE date
  USING delivery_date::date;

