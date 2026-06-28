import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  templatedSongInstancesTable,
  templatedInstanceFeedbackEventsTable,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getAnonymousCookie } from "@/lib/auth/cookies";
import { resolveVendorOrder } from "@/lib/vendor-order/resolve";
import { withApiLogger } from "@/lib/logger/api-middleware";
import { logStructuredError } from "@/lib/logger/utils";

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

  return rows[0] ?? null;
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

  return rows[0] ?? null;
}

async function handler(
  req: NextRequest,
  context: { logger: any; requestId?: string; params?: Promise<{ slug: string }> },
) {
  if (req.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  const params = await (context.params ?? Promise.resolve({ slug: "" }));
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const orderToken = req.nextUrl.searchParams.get("order_token") ?? undefined;
    const ownedInstance = await resolveOwnedInstance(req, slug);
    const instance =
      ownedInstance ??
      (orderToken ? await resolveVendorInstance(slug, orderToken) : null);

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const events = await db
      .select({
        id: templatedInstanceFeedbackEventsTable.id,
        variant_index: templatedInstanceFeedbackEventsTable.variant_index,
        event_type: templatedInstanceFeedbackEventsTable.event_type,
        decision: templatedInstanceFeedbackEventsTable.decision,
        rating: templatedInstanceFeedbackEventsTable.rating,
        reason_codes: templatedInstanceFeedbackEventsTable.reason_codes,
        other_text: templatedInstanceFeedbackEventsTable.other_text,
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
      .limit(100);

    const eventsByVariant = events.reduce<Record<number, any[]>>((acc, ev) => {
      const key = ev.variant_index;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    }, {});

    const latestDecisionForVariant = (variantIndex: 0 | 1) =>
      events.find(
        (ev) =>
          ev.variant_index === variantIndex &&
          (ev.decision === "liked" || ev.decision === "disliked"),
      );
    const latestRatingForVariant = (variantIndex: 0 | 1) =>
      events.find(
        (ev) => ev.variant_index === variantIndex && typeof ev.rating === "number",
      );

    const v0DecisionEvent = latestDecisionForVariant(0);
    const v1DecisionEvent = latestDecisionForVariant(1);
    const v0RatingEvent = latestRatingForVariant(0);
    const v1RatingEvent = latestRatingForVariant(1);
    const bothVariantsReviewed =
      v0DecisionEvent?.decision != null && v1DecisionEvent?.decision != null;

    const completedAt =
      bothVariantsReviewed && v0DecisionEvent && v1DecisionEvent
        ? new Date(
            Math.max(
              new Date(v0DecisionEvent.created_at).getTime(),
              new Date(v1DecisionEvent.created_at).getTime(),
            ),
          )
        : null;

    const state = {
      templated_song_instance_id: instance.id,
      variant_0_decision: v0DecisionEvent?.decision ?? null,
      variant_1_decision: v1DecisionEvent?.decision ?? null,
      variant_0_rating: v0RatingEvent?.rating ?? null,
      variant_1_rating: v1RatingEvent?.rating ?? null,
      both_variants_reviewed: bothVariantsReviewed,
      completed_at: completedAt,
      updated_at: events[0]?.created_at ?? null,
    };

    return NextResponse.json({
      success: true,
      state,
      eventsByVariant,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: "templated-instance-feedback-summary",
      requestId: context.requestId,
      additionalData: { slug },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load feedback summary",
      },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger("templated-instance-feedback-summary", handler);
