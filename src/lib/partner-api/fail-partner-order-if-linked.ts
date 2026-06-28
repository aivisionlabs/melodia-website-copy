/**
 * When a user_song's song_request is linked to a partner API order, mark the order failed
 * Used from Suno webhook and song-status polling.
 */
import { db } from '@/lib/db';
import { songRequestsTable, partnerApiOrdersTable, partnerApiVendorsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type FailureLogger = {
  info: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
};

export async function failPartnerOrderIfLinked(
  songRequestId: number,
  errorMessage: string,
  logger: FailureLogger,
): Promise<void> {
  try {
    const [songRequest] = await db
      .select({ partner_api_order_id: songRequestsTable.partner_api_order_id })
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, songRequestId))
      .limit(1);

    const partnerApiOrderId = (songRequest as { partner_api_order_id?: number | null })?.partner_api_order_id as
      | number
      | null;
    if (!partnerApiOrderId) return;

    const rows = await db
      .select({ order: partnerApiOrdersTable, vendor: partnerApiVendorsTable })
      .from(partnerApiOrdersTable)
      .innerJoin(partnerApiVendorsTable, eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id))
      .where(eq(partnerApiOrdersTable.id, partnerApiOrderId))
      .limit(1);

    if (rows.length === 0) return;
    const { order, vendor } = rows[0];
    if (order.status === 'failed') return;

    const failedOrder = await db
      .update(partnerApiOrdersTable)
      .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, order.id))
      .returning()
      .then((r) => r[0]);

    if (!failedOrder) return;
    logger.info('Partner order failed via Suno failure handler', {
      orderId: order.id,
      vendorId: vendor.id,
      songRequestId,
    });
  } catch (err) {
    logger.error('Failed to mark partner order as failed after song error', {
      songRequestId,
      error: String(err),
    });
  }
}
