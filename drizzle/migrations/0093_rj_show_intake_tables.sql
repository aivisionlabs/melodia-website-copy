-- RJ Show Intake: dynamic question/answer tables + intake_submitted_at on rj_shows
--> statement-breakpoint
ALTER TABLE "rj_shows" ADD COLUMN "intake_submitted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "rj_shows" ALTER COLUMN "story_details" SET DEFAULT '';
--> statement-breakpoint
CREATE TYPE "public"."rj_show_intake_input_type" AS ENUM('text', 'textarea', 'select', 'date', 'file_upload', 'toggle');
--> statement-breakpoint
CREATE TABLE "rj_show_intake_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"input_type" "rj_show_intake_input_type" NOT NULL,
	"options" jsonb,
	"occasions" text[],
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"group_key" text DEFAULT 'story' NOT NULL,
	"helper_text" text,
	"max_length" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rj_show_intake_questions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "rj_show_intake_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"rj_show_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"question_key" text NOT NULL,
	"answer_text" text,
	"answer_date" date,
	"answer_file_url" text,
	"answer_boolean" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rj_show_intake_answers" ADD CONSTRAINT "rj_show_intake_answers_rj_show_id_rj_shows_id_fk" FOREIGN KEY ("rj_show_id") REFERENCES "public"."rj_shows"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rj_show_intake_answers" ADD CONSTRAINT "rj_show_intake_answers_question_id_rj_show_intake_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."rj_show_intake_questions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "rj_intake_questions_active_idx" ON "rj_show_intake_questions" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "rj_intake_questions_group_idx" ON "rj_show_intake_questions" USING btree ("group_key");
--> statement-breakpoint
CREATE INDEX "rj_intake_questions_sort_idx" ON "rj_show_intake_questions" USING btree ("sort_order");
--> statement-breakpoint
CREATE INDEX "rj_intake_answers_show_idx" ON "rj_show_intake_answers" USING btree ("rj_show_id");
--> statement-breakpoint
CREATE INDEX "rj_intake_answers_show_key_idx" ON "rj_show_intake_answers" USING btree ("rj_show_id", "question_key");
--> statement-breakpoint
-- Seed: default intake questions for all occasions
INSERT INTO "rj_show_intake_questions" ("key", "label", "placeholder", "input_type", "is_required", "sort_order", "group_key", "helper_text", "max_length") VALUES
('recipient_name',       'Name of the special person',                  'e.g. Priya',                   'text',     true,  10, 'recipient',   NULL,                                               100),
('sender_name',          'Your name',                                    'e.g. Nayan',                   'text',     true,  20, 'recipient',   NULL,                                               100),
('sender_relationship',  'Your relationship with them',                  'e.g. daughter, best friend',   'text',     true,  30, 'recipient',   NULL,                                               100),
('recipient_age',        'Their age',                                    'e.g. 50',                      'text',     false, 40, 'recipient',   NULL,                                               10),
('occasion',             'Occasion',                                     NULL,                           'select',   false, 10, 'occasion',    NULL,                                               NULL),
('event_date',           'Date of the special occasion',                 NULL,                           'date',     false, 20, 'occasion',    NULL,                                               NULL),
('about_person',         'Tell us a little about them',                  'Share what makes them special...', 'textarea', true,  10, 'story', 'A few lines about their personality and life',     500),
('things_you_love',      'Things you love the most about them',          'What do you admire most...',   'textarea', true,  20, 'story',   NULL,                                                  500),
('memories',             'Memories you''d like to share',                'A favourite memory together...', 'textarea', false, 30, 'story', NULL,                                                 500),
('special_message',      'Any specific message you''d like to convey',   'What would you like to say...', 'textarea', false, 40, 'story',  NULL,                                                 500),
('celebrities_inspired_by', 'Celebrities they''re fond of or inspired by', 'e.g. A.R. Rahman, Shah Rukh Khan', 'text', false, 50, 'story', NULL,                                              300),
('wants_recording',      'Would you like to add your own recording?',    NULL,                           'toggle',   false, 10, 'media',   'Your voice will be included in the show',             NULL),
('language',             'Preferred language',                           NULL,                           'select',   true,  10, 'preferences', NULL,                                             NULL),
('voice_gender',         'Preferred voice gender',                       NULL,                           'select',   true,  20, 'preferences', NULL,                                             NULL),
('vibe_profile',         'Emotion / tone',                               NULL,                           'select',   false, 30, 'preferences', 'The mood and feel of the show',                  NULL),
('voice_profile',        'Voice',                                        NULL,                           'select',   false, 40, 'preferences', 'The specific voice for the RJ host',             NULL);
--> statement-breakpoint
-- Set select options for static selects
UPDATE "rj_show_intake_questions"
SET "options" = '[{"value":"Birthday","label":"Birthday"},{"value":"Anniversary","label":"Anniversary"},{"value":"Farewell","label":"Farewell"},{"value":"Retirement","label":"Retirement"},{"value":"Wedding","label":"Wedding"},{"value":"Other","label":"Other"}]'::jsonb
WHERE "key" = 'occasion';
--> statement-breakpoint
UPDATE "rj_show_intake_questions"
SET "options" = '[{"value":"male","label":"Male"},{"value":"female","label":"Female"}]'::jsonb
WHERE "key" = 'voice_gender';
