import { db } from "@/lib/db";
import {
  templatedSongInstancesTable,
  templatedSongsTable,
  personasTable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/lib/utils/url";
import { generateBaseSlug } from "@/lib/utils/slug";
import { replacePlaceholderWithName } from "@/lib/templated-songs-utils";
import { convertNameToScript } from "@/lib/services/llm/llm-name-to-script";
import { SunoAPIFactory } from "@/lib/suno-api";
import { checkSunoCreditAndNotify } from "@/lib/suno-credit-alert";
import { DEMO_TASK_ID_PREFIX } from "@/lib/demo-mode";

type GenerateTemplatedInstanceInput = {
  templateId: number;
  name: string;
  /**
   * User-confirmed name in native script. When provided (and not sandbox), this
   * is used verbatim for SUNO instead of the best-guess convertNameToScript.
   */
  nameInScriptOverride?: string | null;
  songRequestId?: number | null;
  userId?: number | null;
  anonymousUserId?: string | null;
  partnerApiOrderId?: number | null;
  sandbox?: boolean;
  logger?: {
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
  };
};

export async function generateUniqueTemplatedInstanceSlug(
  title: string,
): Promise<string> {
  const baseSlug = generateBaseSlug(title || "templated-song");
  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 1000;

  while (counter <= maxAttempts) {
    const existing = await db
      .select()
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.slug, slug))
      .limit(1);
    if (existing.length === 0) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function generateTemplatedInstanceForIdentity({
  templateId,
  name,
  nameInScriptOverride = null,
  songRequestId = null,
  userId = null,
  anonymousUserId = null,
  partnerApiOrderId = null,
  sandbox = false,
  logger,
}: GenerateTemplatedInstanceInput) {
  const templates = await db
    .select()
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.id, templateId))
    .limit(1);

  if (templates.length === 0) {
    logger?.warn("Templated song not found for generate", { templateId });
    throw new Error("Templated song not found");
  }

  const template = templates[0];

  if (!template.template_lyrics?.trim()) {
    logger?.warn("Template has no template_lyrics", { templateId });
    throw new Error("This template is not ready for generation yet.");
  }

  if (!template.persona_id) {
    logger?.warn("Template has no persona_id", { templateId });
    throw new Error("This template is not ready for generation yet.");
  }

  const personas = await db
    .select({ suno_persona_id: personasTable.suno_persona_id })
    .from(personasTable)
    .where(eq(personasTable.id, template.persona_id))
    .limit(1);

  if (!personas[0]?.suno_persona_id) {
    logger?.warn("Persona not found for template", {
      templateId,
      personaId: template.persona_id,
    });
    throw new Error("This template is not ready for generation yet.");
  }

  const trimmedDisplayName = name.trim();
  const trimmedOverride = nameInScriptOverride?.trim();
  // Sandbox skips LLM name conversion so partner pre-started orders always create an
  // instance quickly; convertNameToScript can hang or slow cold starts and leaves the
  // vendor page stuck on loading with no templated_instance row yet.
  // A user-confirmed script name (override) takes priority over the best-guess LLM.
  const nameInScript = sandbox
    ? trimmedDisplayName
    : trimmedOverride ||
      (await convertNameToScript(trimmedDisplayName, template.template_lyrics));
  logger?.info("Templated generate: name script conversion", {
    templateId,
    sandbox,
    usedConfirmedOverride: !sandbox && !!trimmedOverride,
    nameLength: trimmedDisplayName.length,
    nameInScriptLength: nameInScript.length,
  });

  const replacedLyricsForSuno = replacePlaceholderWithName(
    template.template_lyrics,
    nameInScript,
  );
  const songTitleForSuno =
    replacePlaceholderWithName(
      template.template_title ?? template.title,
      nameInScript,
    ).trim() || `${template.title} for ${trimmedDisplayName}`;

  const replacedLyricsForUser = replacePlaceholderWithName(
    template.template_lyrics,
    trimmedDisplayName,
  );
  const songTitleForUser =
    replacePlaceholderWithName(
      template.template_title ?? template.title,
      trimmedDisplayName,
    ).trim() || `${template.title} for ${trimmedDisplayName}`;

  let taskId: string;

  if (sandbox) {
    taskId = `${DEMO_TASK_ID_PREFIX}${Date.now()}`;
    logger?.info("Sandbox mode: using demo task ID", { taskId });
  } else {
    const baseUrl = await getBaseUrl();
    const callbackUrl = `${baseUrl}/api/suno-webhook/templated-songs/instances`;

    const sunoAPI = SunoAPIFactory.getAPI();
    const sunoResponse = await sunoAPI.generateSong({
      title: songTitleForSuno,
      prompt: replacedLyricsForSuno,
      callBackUrl: callbackUrl,
      personaId: personas[0].suno_persona_id,
    });

    if (sunoResponse.code !== 200 || !sunoResponse.data?.taskId) {
      logger?.error("Suno API error in templated generate", {
        code: sunoResponse.code,
        msg: sunoResponse.msg,
      });
      throw new Error(sunoResponse.msg || "Failed to start song generation.");
    }

    taskId = sunoResponse.data.taskId.trim();
  }
  const slug = await generateUniqueTemplatedInstanceSlug(songTitleForUser);

  const [instance] = await db
    .insert(templatedSongInstancesTable)
    .values({
      template_id: templateId,
      recipient_name: trimmedDisplayName,
      replaced_lyrics: replacedLyricsForUser,
      song_title: songTitleForUser,
      persona_id: template.persona_id,
      suno_task_id: taskId,
      status: "processing",
      slug,
      user_id: userId,
      anonymous_user_id: anonymousUserId,
      partner_api_order_id: partnerApiOrderId,
      singalong_lyrics_enabled: false,
      metadata: {
        sunoTaskId: taskId,
        estimatedTime: 120,
        songRequestId,
        name_in_script: nameInScript,
      },
    })
    .returning();

  if (!instance) {
    throw new Error("Failed to create song instance.");
  }

  logger?.info("Templated song instance created", {
    instanceId: instance.id,
    slug: instance.slug,
    taskId,
    templateId,
  });

  if (!sandbox) {
    void checkSunoCreditAndNotify();
  }

  return {
    instanceId: instance.id,
    slug: instance.slug,
    taskId,
  };
}
