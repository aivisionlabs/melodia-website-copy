/**
 * Order Creators — product-type registry for POST /orders
 *
 * Each product type registers:
 *   - `schema`   — Zod schema for its extra request fields (beyond the base fields)
 *   - `create`   — async function that does all product-specific work after the
 *                  base order row has been inserted with status 'pending'
 *
 * The POST handler handles everything product-agnostic (parsing, idempotency,
 * price resolution, order insertion) and then delegates here.
 *
 * To add a new product type:
 *   1. Define a Zod schema for its extra fields.
 *   2. Write a `ProductCreator` function.
 *   3. Add both to the CREATORS map at the bottom. Done.
 */

import { z } from 'zod';
import { after } from 'next/server';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  personasTable,
  templatedSongsTable,
  type SelectPartnerApiOrder,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from '@/lib/utils/url';
import { logger } from '@/lib/logger';
import { notifyPartnerOrderCreationFailed, notifyPartnerOrderFailed } from '@/lib/vendor-order/notification-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductCreatorInput {
  vendor: SelectPartnerApiVendor;
  order: SelectPartnerApiOrder;
  /** Validated product-specific fields (parsed by the registered schema). */
  extra: Record<string, unknown>;
  requestId: string;
}

export interface ProductCreatorResult {
  /** Extra fields merged into the HTTP response body. */
  responseFields: Record<string, unknown>;
  /** Optional: override the order status stored in the response (default: 'processing'). */
  status?: string;
}

export type ProductCreator = (input: ProductCreatorInput) => Promise<ProductCreatorResult>;

export interface ProductRegistration {
  /** Zod schema for fields beyond the base order fields. */
  schema: z.ZodTypeAny;
  create: ProductCreator;
  /** Human-readable label for admin UI. */
  label: string;
  /** One-sentence description of what this product type does. */
  description: string;
}

// ─── customer_custom_song ────────────────────────────────────────────────────

const fullCustomSongExtraSchema = z.object({
  customer_name: z.string().min(1).max(200).trim().optional(),
  occasion: z.string().max(100).trim().optional(),
  package_slug: z.string().max(100).trim().default('package_1'),
});

const createFullCustomSong: ProductCreator = async ({ vendor, order, extra }) => {
  const { customer_name, occasion, package_slug } =
    extra as z.infer<typeof fullCustomSongExtraSchema>;

  const orderToken = crypto.randomUUID();
  const baseUrl = await getBaseUrl();
  const customerLink = `${baseUrl}/vendor/${vendor.slug}/order/${orderToken}`;

  await db
    .update(partnerApiOrdersTable)
    .set({
      order_token: orderToken,
      customer_name: customer_name ?? null,
      package_slug,
      // Store occasion in metadata for pre-filling the form
      metadata: { ...(order.metadata as object | null ?? {}), occasion: occasion ?? null },
      updated_at: new Date(),
    })
    .where(eq(partnerApiOrdersTable.id, order.id));

  logger.info('Partner API: customer_custom_song order created', {
    orderId: order.id,
    vendorId: vendor.id,
    orderToken,
    customerLink,
  });

  return {
    status: 'pending',
    responseFields: {
      order_token: orderToken,
      customer_link: customerLink,
      estimated_completion_minutes: 10,
    },
  };
};

// ─── customer_templated_song ──────────────────────────────────────────────────

const templateSongExtraSchema = z.object({
  customer_name: z.string().min(1).max(200).trim().optional(),
  /**
   * With template_id, recipient_name (base field) is required (validated in POST /orders).
   * Generation starts immediately using recipient_name for the song.
   */
  template_id: z.number().int().positive().optional(),
  occasion: z.string().max(200).trim().optional(),
  package_slug: z.string().max(100).trim().default('package_1'),
});

/** Same readiness rules as generateTemplatedInstanceForIdentity (fail fast on create). */
async function assertTemplatedTemplateReadyForPartnerOrder(templateId: number): Promise<void> {
  const rows = await db
    .select()
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.id, templateId))
    .limit(1);
  if (rows.length === 0) {
    throw Object.assign(new Error('template_id does not refer to a valid templated song.'), {
      code: 'INVALID_TEMPLATE',
      status: 400,
    });
  }
  const t = rows[0];
  if (!t.template_lyrics?.trim() || !t.persona_id) {
    throw Object.assign(
      new Error('This template is not ready for generation yet.'),
      { code: 'TEMPLATE_NOT_READY', status: 400 },
    );
  }
  const p = await db
    .select({ suno_persona_id: personasTable.suno_persona_id })
    .from(personasTable)
    .where(eq(personasTable.id, t.persona_id))
    .limit(1);
  if (!p[0]?.suno_persona_id) {
    throw Object.assign(
      new Error('This template is not ready for generation yet.'),
      { code: 'TEMPLATE_NOT_READY', status: 400 },
    );
  }
}

const createTemplateSongOrder: ProductCreator = async ({ vendor, order, extra, requestId }) => {
  const { customer_name, template_id, occasion, package_slug } =
    extra as z.infer<typeof templateSongExtraSchema>;

  const orderToken = crypto.randomUUID();
  const baseUrl = await getBaseUrl();
  const customerLink = `${baseUrl}/vendor/${vendor.slug}/order/${orderToken}`;

  const trimmedRecipient = order.recipient_name?.trim() ?? '';
  const startGeneration = Boolean(template_id) && trimmedRecipient.length > 0;

  if (startGeneration) {
    await assertTemplatedTemplateReadyForPartnerOrder(template_id!);
  }

  const updatePayload: {
    order_token: string;
    customer_name: string | null;
    occasion: string | null;
    package_slug: string;
    template_id?: number | null;
    status?: 'pending' | 'song_generation_inprogress';
    updated_at: Date;
  } = {
    order_token: orderToken,
    customer_name: customer_name?.trim() || null,
    occasion: occasion ?? null,
    package_slug,
    updated_at: new Date(),
  };
  if (template_id != null) {
    updatePayload.template_id = template_id;
  }
  if (startGeneration) {
    updatePayload.status = 'song_generation_inprogress';
  }

  await db
    .update(partnerApiOrdersTable)
    .set(updatePayload)
    .where(eq(partnerApiOrdersTable.id, order.id));

  if (startGeneration) {
    const tid = template_id as number;
    const sandbox = vendor.sandbox ?? false;
    // Fire-and-forget Promises are often frozen right after the HTTP response on serverless
    // (Vercel): Suno never runs and errors may not flush. `after()` keeps the invocation
    // alive until this work finishes (Next.js 15.1+).
    logger.info('Partner API: scheduling templated Suno generation', {
      orderId: order.id,
      templateId: tid,
      sandbox,
    });
    after(async () => {
      try {
        await generateTemplatedInstanceForIdentity({
          templateId: tid,
          name: trimmedRecipient,
          partnerApiOrderId: order.id,
          sandbox,
          logger: {
            info: (msg, data) =>
              logger.info(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
            warn: (msg, data) =>
              logger.warn(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
            error: (msg, data) =>
              logger.error(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Partner API: customer_templated_song auto-generate failed', {
          orderId: order.id,
          templateId: tid,
          error: message,
        });
        const [failedOrder] = await db
          .update(partnerApiOrdersTable)
          .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
          .where(eq(partnerApiOrdersTable.id, order.id))
          .returning();

        void notifyPartnerOrderCreationFailed({
          vendor,
          order: failedOrder ?? order,
          errorMessage: message,
          errorCode: 'TEMPLATE_GENERATION_FAILED',
          source: 'partner-api-templated-auto-generate',
          requestId,
          productType: 'customer_templated_song',
        });

        if (failedOrder) {
          notifyPartnerOrderFailed(failedOrder, vendor, message, logger, {
            failedStep: 'template_generation',
          });
        }
      }
    });
  }

  logger.info('Partner API: customer_templated_song order created', {
    orderId: order.id,
    vendorId: vendor.id,
    orderToken,
    customerLink,
    occasion,
    templateId: template_id,
    startGeneration,
  });

  return {
    status: startGeneration ? 'song_generation_inprogress' : 'pending',
    responseFields: {
      order_token: orderToken,
      customer_link: customerLink,
      estimated_completion_minutes: 3,
    },
  };
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add new product types here — no other file needs to change.

export const PRODUCT_CREATORS: Record<string, ProductRegistration> = {
  customer_templated_song: {
    schema: templateSongExtraSchema,
    create: createTemplateSongOrder,
    label: 'Templated Song (Customer UI)',
    description:
      'Customer can pick a template and recipient on a co-branded page, or the partner can pass template_id with recipient_name (required when template_id is set) to start generation immediately so the link opens on the generating or song player screen.',
  },
  customer_custom_song: {
    schema: fullCustomSongExtraSchema,
    create: createFullCustomSong,
    label: 'Custom Song (Customer UI)',
    description: 'Customer fills a story form on a co-branded page. LLM generates personalised lyrics, customer reviews and approves, then Suno generates the song.',
  },
};

// ─── Base schema (common to every product type) ───────────────────────────────

/**
 * Optional partner-supplied phone (local or international).
 * Allows common formatting; validates digit count to E.164 bounds (8–15 digits).
 */
const customerMobileSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^\+?[\d\s\-().]+$/, 'Invalid customer_mobile format')
  .refine(
    (s) => {
      const digits = (s.match(/\d/g) ?? []).length;
      return digits >= 8 && digits <= 15;
    },
    { message: 'customer_mobile must contain 8–15 digits (international E.164 length)' },
  );

export const baseOrderSchema = z.object({
  product_type: z.string().min(1),
  external_order_id: z.string().min(1).max(500),
  // Optional at base level — customer flows can collect recipient details later.
  recipient_name: z.string().min(1).max(200).trim().optional(),
  /** Optional; stored on the order row for ops / CRM. */
  customer_mobile: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    customerMobileSchema.optional(),
  ),
  webhook_url: z.string().url().optional(),
  idempotency_key: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});
