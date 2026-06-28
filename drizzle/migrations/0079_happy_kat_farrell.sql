CREATE TYPE "public"."rj_voice_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "rj_vibe_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"prompt_instructions" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rj_vibe_profiles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "rj_voice_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"gender" "rj_voice_gender" NOT NULL,
	"provider" text DEFAULT 'elevenlabs' NOT NULL,
	"provider_voice_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default_for_gender" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rj_voice_profiles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "rj_shows" ADD COLUMN "voice_gender" "rj_voice_gender" DEFAULT 'female' NOT NULL;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD COLUMN "voice_profile_id" integer;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD COLUMN "vibe_profile_id" integer;--> statement-breakpoint
CREATE INDEX "rj_vibe_profiles_active_idx" ON "rj_vibe_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rj_vibe_profiles_sort_idx" ON "rj_vibe_profiles" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "rj_voice_profiles_active_idx" ON "rj_voice_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rj_voice_profiles_gender_active_idx" ON "rj_voice_profiles" USING btree ("gender","is_active");--> statement-breakpoint
CREATE INDEX "rj_voice_profiles_sort_idx" ON "rj_voice_profiles" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "rj_voice_profiles_default_per_gender_unique" ON "rj_voice_profiles" USING btree ("gender") WHERE "rj_voice_profiles"."is_default_for_gender" = true;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD CONSTRAINT "rj_shows_voice_profile_id_rj_voice_profiles_id_fk" FOREIGN KEY ("voice_profile_id") REFERENCES "public"."rj_voice_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD CONSTRAINT "rj_shows_vibe_profile_id_rj_vibe_profiles_id_fk" FOREIGN KEY ("vibe_profile_id") REFERENCES "public"."rj_vibe_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rj_shows_voice_profile_id_idx" ON "rj_shows" USING btree ("voice_profile_id");--> statement-breakpoint
CREATE INDEX "rj_shows_vibe_profile_id_idx" ON "rj_shows" USING btree ("vibe_profile_id");
--> statement-breakpoint
INSERT INTO "rj_voice_profiles" ("key", "label", "gender", "provider", "provider_voice_id", "is_active", "is_default_for_gender", "sort_order", "metadata")
VALUES
  ('female_default', 'Female (Default)', 'female', 'elevenlabs', 'env_default', true, true, 1, '{"notes":"Uses ELEVENLABS_DEFAULT_VOICE_ID until configured with a dedicated voice id."}'),
  ('male_default', 'Male (Default)', 'male', 'elevenlabs', 'env_default', true, true, 1, '{"notes":"Uses ELEVENLABS_DEFAULT_VOICE_ID until configured with a dedicated voice id."}')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "rj_vibe_profiles" ("key", "label", "description", "prompt_instructions", "is_active", "sort_order")
VALUES
  ('funny', 'Funny', 'Playful, witty, and upbeat radio tone.', 'Keep the show playful and witty. Prefer sharp observational humor, light callbacks, and cheerful pacing without becoming mean.', true, 1),
  ('emotional', 'Emotional', 'Warm, heartfelt, and sentimental.', 'Keep the narration warm, heartfelt, and emotionally resonant. Prioritize sincerity and gentle transitions over punchlines.', true, 2),
  ('roast', 'Roast', 'Affectionate roast tone with safe, non-hurtful humor.', 'Use a roast-inspired style that is affectionate and safe. Teasing should feel loving and never insulting, abusive, or humiliating.', true, 3),
  ('emotional_tears', 'Emotional Tears', 'Deeply moving and touching storytelling.', 'Lean into deeply touching storytelling. Build emotional crescendos with tenderness and gratitude while still sounding natural and grounded.', true, 4)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "rj_shows" AS rs
SET "voice_profile_id" = vp.id
FROM "rj_voice_profiles" AS vp
WHERE rs."voice_profile_id" IS NULL
  AND vp."key" = CASE
    WHEN rs."voice_gender" = 'male' THEN 'male_default'
    ELSE 'female_default'
  END;
--> statement-breakpoint
UPDATE "rj_shows" AS rs
SET "vibe_profile_id" = vib.id
FROM "rj_vibe_profiles" AS vib
WHERE rs."vibe_profile_id" IS NULL
  AND vib."key" = 'funny';