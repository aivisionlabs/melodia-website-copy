/**
 * Pure helper: derive the order status returned from GET /api/vendor-order/{token}
 * when the DB row is still `song_generation_inprogress` but the child entity
 * (user_song or templated instance) has already completed or failed.
 */
export function getEffectiveVendorOrderStatusForResponse(input: {
  orderStatus: string;
  productType: string;
  templatedInstanceStatus: string | null | undefined;
  userSongStatus: string | null | undefined;
}): string {
  const { orderStatus, productType, templatedInstanceStatus, userSongStatus } = input;
  if (orderStatus !== 'song_generation_inprogress') return orderStatus;
  if (productType === 'customer_templated_song') {
    if (templatedInstanceStatus === 'completed') return 'completed';
    if (templatedInstanceStatus === 'failed') return 'failed';
  } else if (productType === 'customer_custom_song') {
    if (userSongStatus === 'completed') return 'completed';
    if (userSongStatus === 'failed') return 'failed';
  }
  return orderStatus;
}
