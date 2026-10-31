import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { rateFood } from '@/lib/storefront/ratings.functions';
import { sfKeys } from '@/lib/storefront/queries';
import type { StreetOsOrder } from '@/lib/streetos/client.server';

export function FoodRatings({ order }: { order: StreetOsOrder }) {
  if (order.status !== 'completed' || order.order_items.length === 0) return null;
  const dishes = order.order_items.filter((item, index, all) => !item.product_id || all.findIndex(other => other.product_id === item.product_id) === index)
    .map(item => order.order_items.find(other => item.product_id && other.product_id === item.product_id && other.rating != null) ?? item);
  return <section className="mt-5 rounded-lg border border-line bg-card p-5 shadow-food">
    <h2 className="font-display text-xl font-bold">Rate your food</h2>
    {!order.rating_token && <p className="mt-2 text-sm text-muted-foreground">This kitchen hasn't enabled food ratings yet.</p>}
    <div className="mt-3 divide-y divide-line">
      {dishes.map(item => <DishRating key={`${order.id}:${item.id}`} orderId={order.id} token={order.rating_token ?? null} item={item} />)}
    </div>
  </section>;
}

function DishRating({ orderId, token, item }: { orderId: string; token: string | null; item: StreetOsOrder['order_items'][number] }) {
  const submit = useServerFn(rateFood);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(0);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const saved = item.rating ?? confirmed;
  const disabled = busy || !token || saved != null;
  const save = async () => {
    if (!token || selected < 1 || disabled) return;
    setBusy(true); setError('');
    try {
      const result = await submit({ data: { orderId, itemId: item.id, rating: selected, token, ...(comment.trim() ? { comment: comment.trim() } : {}) } });
      if (!result.ok) { setError(result.error); return; }
      setConfirmed(result.rating);
      await queryClient.invalidateQueries({ queryKey: sfKeys.order(orderId) });
      await queryClient.invalidateQueries({ queryKey: ['storefront', 'menu'] });
    } catch { setError('Could not save your rating. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="py-4 first:pt-1 last:pb-0">
    <p className="break-words text-sm font-semibold">{item.product_name}</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label={`Rate ${item.product_name}`} className="flex shrink-0 gap-1">
        {[1, 2, 3, 4, 5].map(score => <Button key={score} variant="ghost" size="icon" aria-label={`${score} ${score === 1 ? 'star' : 'stars'} for ${item.product_name}`} aria-pressed={(saved ?? selected) === score} disabled={disabled} onClick={() => { setSelected(score); setError(''); }} className={`h-10 w-10 rounded-full ${score <= (saved ?? selected) ? 'text-primary' : 'text-muted-foreground'}`}>
          <Star aria-hidden="true" className={`h-6 w-6 ${score <= (saved ?? selected) ? 'fill-current' : ''}`} />
        </Button>)}
      </div>
      {saved != null ? <span role="status" className="flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-4 w-4" />{saved}/5 · Thanks for rating</span> : token ? <Button onClick={() => void save()} disabled={busy || selected === 0} className="h-10 rounded-full px-4 text-xs">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save rating</Button> : null}
    </div>
    {saved == null && token ? <div className="mt-3">
      <label htmlFor={`rating-comment-${item.id}`} className="text-xs font-semibold text-muted-foreground">Comment (optional)</label>
      <Textarea id={`rating-comment-${item.id}`} value={comment} onChange={event => setComment(event.target.value)} maxLength={500} disabled={busy} className="mt-1 min-h-20 resize-y" />
      <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length}/500</p>
    </div> : (item.rating_comment || (confirmed != null && comment.trim())) ? <p className="mt-2 break-words text-sm text-muted-foreground">{item.rating_comment ?? comment.trim()}</p> : null}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}