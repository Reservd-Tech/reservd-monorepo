import { z } from 'zod';

export const foodRatingSchema = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  token: z.string().min(32).max(2048),
  comment: z.string().trim().max(500).optional(),
});

export function canRateFood(order: { status: string; rating_token?: string | null }, item: { rating?: number | null }) {
  return order.status === 'completed' && Boolean(order.rating_token) && item.rating == null;
}

export function ratingSummary(product: { avg_rating?: number | string | null; rating_count?: number | null }) {
  const average = Number(product.avg_rating);
  const count = product.rating_count;
  if (!Number.isInteger(count) || count == null || count <= 0 || !Number.isFinite(average) || average < 1 || average > 5) return null;
  return { average, count };
}

export function sortTopRated<T extends { avg_rating?: number | string | null; rating_count?: number | null }>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const left = ratingSummary(a), right = ratingSummary(b);
    return (right?.average ?? 0) - (left?.average ?? 0) || (right?.count ?? 0) - (left?.count ?? 0);
  });
}