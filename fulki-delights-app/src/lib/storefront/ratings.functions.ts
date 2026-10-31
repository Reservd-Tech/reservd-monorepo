import { createServerFn } from '@tanstack/react-start';
import { foodRatingSchema, canRateFood } from './ratings';

export const rateFood = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => foodRatingSchema.parse(input))
  .handler(async ({ data }) => {
    const { fetchStreetOsOrder, submitFoodRating, StreetOsError } = await import('@/lib/streetos/client.server');
    try {
      const order = await fetchStreetOsOrder(data.orderId);
      const item = order?.order_items.find(item => item.id === data.itemId);
      const alreadyRated = item?.product_id && order?.order_items.some(other => other.product_id === item.product_id && other.rating != null);
      if (!order || !item || alreadyRated || order.rating_token !== data.token || !canRateFood(order, item)) {
        return { ok: false as const, error: 'This dish cannot be rated right now. Refresh your order and try again.' };
      }
      const result = await submitFoodRating(data);
      if (result.itemId !== data.itemId || result.rating !== data.rating) {
        return { ok: false as const, error: 'Could not confirm your rating was saved. Refresh your order before trying again.' };
      }
      if (data.comment && result.comment !== data.comment) {
        return { ok: false as const, error: 'Could not confirm your comment was saved. Refresh your order before trying again.' };
      }
      return { ok: true as const, itemId: result.itemId, rating: result.rating };
    } catch (error) {
      return { ok: false as const, error: error instanceof StreetOsError && error.status === 404
        ? 'This kitchen has not enabled food ratings yet.'
        : 'Could not save your rating. Please try again.' };
    }
  });