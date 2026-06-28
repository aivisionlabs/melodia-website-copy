-- Migration: Remove selected_package column from song_requests
-- Description: 
--   Removes the redundant selected_package text column since we now use package_id foreign key
--   Package information can be retrieved via JOIN with packages table
-- Date: 2025-11-06

-- Drop the selected_package column (data already migrated to package_id)
ALTER TABLE "song_requests" DROP COLUMN IF EXISTS "selected_package";

