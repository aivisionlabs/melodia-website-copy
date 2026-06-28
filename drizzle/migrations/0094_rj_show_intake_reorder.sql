-- RJ Show Intake: fix global sort_order, add missing youtube_links + user_voice_file questions
-- Groups appear in this order: recipient → occasion → story → songs → media → preferences
--> statement-breakpoint

-- Fix sort_orders to be globally unique so group sequence is deterministic
UPDATE "rj_show_intake_questions" SET "sort_order" = 10  WHERE "key" = 'recipient_name';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 20  WHERE "key" = 'sender_name';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 30  WHERE "key" = 'sender_relationship';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 40  WHERE "key" = 'recipient_age';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 50  WHERE "key" = 'occasion';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 60  WHERE "key" = 'event_date';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 70  WHERE "key" = 'about_person';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 80  WHERE "key" = 'things_you_love';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 90  WHERE "key" = 'memories';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 100 WHERE "key" = 'special_message';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 110 WHERE "key" = 'celebrities_inspired_by';
--> statement-breakpoint
-- songs group (120)
UPDATE "rj_show_intake_questions" SET "sort_order" = 120, "group_key" = 'songs' WHERE "key" = 'youtube_links';
--> statement-breakpoint
-- media group (130-140)
UPDATE "rj_show_intake_questions" SET "sort_order" = 130 WHERE "key" = 'wants_recording';
--> statement-breakpoint
-- preferences group (150-180)
UPDATE "rj_show_intake_questions" SET "sort_order" = 150 WHERE "key" = 'language';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 160 WHERE "key" = 'voice_gender';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 170 WHERE "key" = 'vibe_profile';
--> statement-breakpoint
UPDATE "rj_show_intake_questions" SET "sort_order" = 180 WHERE "key" = 'voice_profile';
--> statement-breakpoint

-- Add missing: youtube_links (songs group) — rendered via RjShowYoutubeLinksInput component
INSERT INTO "rj_show_intake_questions" ("key", "label", "placeholder", "input_type", "is_required", "sort_order", "group_key", "helper_text", "max_length")
VALUES ('youtube_links', 'Add songs for your show', NULL, 'text', false, 120, 'songs', 'Paste YouTube links for songs you want in the show', NULL)
ON CONFLICT ("key") DO UPDATE SET
  "sort_order" = 120,
  "group_key"  = 'songs',
  "updated_at" = now();
--> statement-breakpoint

-- Add missing: user_voice_file (media group) — shown only when wants_recording = true
INSERT INTO "rj_show_intake_questions" ("key", "label", "placeholder", "input_type", "is_required", "sort_order", "group_key", "helper_text", "max_length")
VALUES ('user_voice_file', 'Upload your recording', NULL, 'file_upload', false, 140, 'media', 'Your voice will be played in the show. MP3 format recommended.', NULL)
ON CONFLICT ("key") DO UPDATE SET
  "sort_order" = 140,
  "group_key"  = 'media',
  "updated_at" = now();
