import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  templatedSongInstancesTable,
  templatedInstanceFeedbackEventsTable,
  songFeedbackReasonsTable,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getAnonymousCookie } from "@/lib/auth/cookies";
import { resolveVendorOrder } from "@/lib/vendor-order/resolve";
import { withApiLogger } from "@/lib/logger/api-middleware";
import { logStructuredError } from "@/lib/logger/utils";

const bodySchema = z.object({
  variant_index: z.number().int().min(0).max(1),
  event_type: z.enum([
    "variant_listened",
    "variant_rated",
    "variant_decision",
  ]),
  decision: z.enum(["liked", "disliked"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  reasons: z.array(z.string()).optional(),
  other_text: z.string().max(1000).optional(),
  positive_aspects: z.array(z.string().min(1).max(120)).max(10).optional(),
  positive_other_text: z.string().max(1000).optional(),
  client_session_id: z.string().max(200).optional(),
  request_id: z.string().max(200).optional(),
  order_token: z.string().max(200).optional(),
});

async function resolveVendorInstance(slug: string, orderToken: string) {
  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved || resolved.order.product_type !== "customer_templated_song") return null;

  const rows = await db
    .select()
    .from(templatedSongInstancesTable)
    .where(
      and(
        eq(templatedSongInstancesTable.slug, slug),
        eq(templatedSongInstancesTable.partner_api_order_id, resolved.order.id),
      ),
    )
    .limit(1);

  return rows[0] ? { instance: rows[0], partnerApiOrderId: resolved.order.id } : null;
}

async function resolveOwnedInstance(req: NextRequest, slug: string) {
  const user = await getCurrentUser(req);
  const anonymousId = await getAnonymousCookie();
  const identityCondition = user?.id
    ? eq(templatedSongInstancesTable.user_id, parseInt(String(user.id), 10))
    : anonymousId
      ? and(
          isNull(templatedSongInstancesTable.user_id),
          eq(templatedSongInstancesTable.anonymous_user_id, anonymousId),
        )
      : null;

  if (!identityCondition) return null;

  const rows = await db
    .select()
    .from(templatedSongInstancesTable)
    .where(and(eq(templatedSongInstancesTable.slug, slug), identityCondition))
    .limit(1);

  return {
    instance: rows[0] ?? null,
    userId: user?.id ? parseInt(String(user.id), 10) : null,
    anonymousId: anonymousId ?? null,
  };
}

async function handler(
  req: NextRequest,
  context: { logger: any; requestId?: string; params?: Promise<{ slug: string }> },
) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  const logger = context.logger;
  const params = await (context.params ?? Promise.resolve({ slug: "" }));
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      logger.warn("Templated feedback validation failed", {
        slug,
        errors: parsed.error.errors,
      });
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const owned = await resolveOwnedInstance(req, slug);
    const vendorOwned =
      !owned?.instance && body.order_token
        ? await resolveVendorInstance(slug, body.order_token)
        : null;

    const instance = owned?.instance ?? vendorOwned?.instance ?? null;
    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const userId = owned?.userId ?? null;
    const anonymousId = owned?.anonymousId ?? null;
    const partnerApiOrderId = vendorOwned?.partnerApiOrderId ?? null;

    let reasonCodes: string[] = [];
    if (body.reasons?.length) {
      const rows = await db.select().from(songFeedbackReasonsTable);
      const labelToCode = new Map(rows.map((r) => [r.label, r.code]));
      reasonCodes = body.reasons
        .map((r) => labelToCode.get(r) || r)
        .filter(Boolean) as string[];
    }

    const positiveAspects = body.positive_aspects
      ?.map((aspect) => aspect.trim())
      .filter(Boolean);

    await db.insert(templatedInstanceFeedbackEventsTable).values({
      templated_song_instance_id: instance.id,
      variant_index: body.variant_index,
      event_type: body.event_type,
      decision: body.decision,
      rating: body.rating ?? null,
      reason_codes: reasonCodes.length ? reasonCodes : null,
      other_text:
        body.other_text && body.other_text.trim()
          ? body.other_text.trim()
          : null,
      positive_aspects: positiveAspects?.length ? positiveAspects : null,
      positive_other_text:
        body.positive_other_text && body.positive_other_text.trim()
          ? body.positive_other_text.trim()
          : null,
      user_id: userId,
      anonymous_user_id: anonymousId,
      partner_api_order_id: partnerApiOrderId,
      client_session_id: body.client_session_id ?? null,
      request_id: body.request_id ?? context.requestId ?? null,
      metadata: {
        slug,
      },
    });

    const latestEvents = await db
      .select({
        id: templatedInstanceFeedbackEventsTable.id,
        variant_index: templatedInstanceFeedbackEventsTable.variant_index,
        event_type: templatedInstanceFeedbackEventsTable.event_type,
        decision: templatedInstanceFeedbackEventsTable.decision,
        rating: templatedInstanceFeedbackEventsTable.rating,
        positive_aspects: templatedInstanceFeedbackEventsTable.positive_aspects,
        positive_other_text:
          templatedInstanceFeedbackEventsTable.positive_other_text,
        created_at: templatedInstanceFeedbackEventsTable.created_at,
      })
      .from(templatedInstanceFeedbackEventsTable)
      .where(
        eq(
          templatedInstanceFeedbackEventsTable.templated_song_instance_id,
          instance.id,
        ),
      )
      .orderBy(desc(templatedInstanceFeedbackEventsTable.created_at))
      .limit(20);

    logger.info("Templated feedback event saved", {
      slug,
      instanceId: instance.id,
      eventType: body.event_type,
      variantIndex: body.variant_index,
      positiveAspectsCount: positiveAspects?.length ?? 0,
      via: partnerApiOrderId ? "vendor_order" : "user_identity",
    });

    return NextResponse.json({
      success: true,
      latestEvents,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: "templated-instance-feedback-post",
      requestId: context.requestId,
      additionalData: { slug },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save templated feedback",
      },
      { status: 500 },
    );
  }
}

export const POST = withApiLogger("templated-instance-feedback-post", handler);
