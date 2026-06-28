-- Drop RJ Show tables and enums
-- Drop tables in dependency order (child tables first)
DROP TABLE IF EXISTS rj_show_intake_answers;
DROP TABLE IF EXISTS rj_show_intake_questions;
DROP TABLE IF EXISTS rj_show_revisions;
DROP TABLE IF EXISTS rj_show_segments;
DROP TABLE IF EXISTS rj_shows;
DROP TABLE IF EXISTS rj_vibe_profiles;
DROP TABLE IF EXISTS rj_voice_profiles;

-- Drop enums (after all tables that use them are dropped)
DROP TYPE IF EXISTS rj_show_intake_input_type;
DROP TYPE IF EXISTS rj_show_revision_status;
DROP TYPE IF EXISTS rj_show_segment_status;
DROP TYPE IF EXISTS rj_show_segment_type;
DROP TYPE IF EXISTS rj_show_status;
DROP TYPE IF EXISTS rj_voice_gender;

-- Drop RJ show columns from partner_api_invoice_line_items
ALTER TABLE partner_api_invoice_line_items DROP COLUMN IF EXISTS rj_show_id;
ALTER TABLE partner_api_invoice_line_items DROP COLUMN IF EXISTS paragraphs;
ALTER TABLE partner_api_invoice_line_items DROP COLUMN IF EXISTS revision_count;
