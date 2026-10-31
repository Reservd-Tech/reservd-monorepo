import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { qk } from './queries';

const acceptedOrder = z.object({
  id: z.string(), orderNumber: z.number(), updatedAt: z.string(), createdAt: z.string(),
  items: z.array(z.object({ id: z.string(), productId: z.string().nullable(), name: z.string(), quantity: z.number().int().positive() })),
});
const resultSchema = z.object({ snapshot: z.array(acceptedOrder), orders: z.array(acceptedOrder), quantity: z.number(), remaining: z.number(), committed: z.boolean() });
export type AcceptancePreview = z.infer<typeof resultSchema>;

export function useBulkItemAcceptance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, capacity, expected }: { productId: string; capacity: number; expected?: AcceptancePreview['snapshot'] }) => {
      const { data, error } = await supabase.rpc('bulk_accept_item_orders', { p_product_id: productId, p_capacity: capacity, p_expected: expected as Json | undefined });
      if (error) throw new Error(error.message);
      return resultSchema.parse(data);
    },
    onSuccess: (result) => { if (result.committed) qc.invalidateQueries({ queryKey: qk.orders }); },
    onError: () => { qc.invalidateQueries({ queryKey: qk.orders }); },
  });
}