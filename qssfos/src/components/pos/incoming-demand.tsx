import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Clock, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { incomingDemand, type IncomingDemand } from '@/lib/pos/acceptance';
import { useBulkItemAcceptance, type AcceptancePreview } from '@/lib/pos/bulk-acceptance';
import { elapsedMinutes, formatElapsed, summarizeItems } from '@/lib/pos/production';
import { useProducts } from '@/lib/pos/queries';
import type { OrderWithItems } from '@/lib/pos/types';

export function IncomingItemDemand({ orders, onProduction }: { orders: OrderWithItems[]; onProduction: () => void }) {
  const rows = useMemo(() => incomingDemand(orders), [orders]);
  const { data: products = [] } = useProducts();
  const mutation = useBulkItemAcceptance();
  const [selected, setSelected] = useState<IncomingDemand | null>(null);
  const [capacity, setCapacity] = useState(1);
  const [preview, setPreview] = useState<AcceptancePreview | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const valid = Number.isInteger(capacity) && capacity > 0 && capacity <= (selected?.units ?? 0);
  function changeQuantity(q: number) { setCapacity(q); setPreview(null); setError(''); }
  async function review() {
    if (!selected?.productId || !valid) return;
    setError('');
    try { setPreview(await mutation.mutateAsync({ productId: selected.productId, capacity })); }
    catch (e) { setPreview(null); setError(e instanceof Error ? e.message : 'Unable to review demand. Try again.'); }
  }
  async function confirm() {
    if (!selected?.productId || !preview?.quantity) return;
    try {
      const result = await mutation.mutateAsync({ productId: selected.productId, capacity, expected: preview.snapshot });
      toast.success(`${result.quantity} × ${selected.name} accepted in ${result.orders.length} complete orders`, { action: { label: 'Production', onClick: onProduction } });
      setSelected(null); setPreview(null);
    } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : 'Demand changed. Review again.'); }
  }
  return <section className="space-y-3" aria-label="Incoming Item Demand">
    <h2 className="text-lg font-semibold">Incoming Item Demand</h2>
    {!rows.length && <p className="py-8 text-center text-muted-foreground">No incoming demand</p>}
    <ul className="divide-y divide-border">
      {rows.map(row => {
        const image = products.find(p => p.id === row.productId)?.image_url;
        return <li key={row.key} className="py-3">
          <div className="flex items-center gap-3">
            {image && <img src={image} alt="" className="size-12 shrink-0 rounded-md object-cover" />}
            <div className="min-w-0 flex-1"><p className="break-words font-semibold">{row.name}</p>
              <p className="text-sm text-muted-foreground"><strong className="text-xl tabular-nums text-foreground">{row.units}</strong> awaiting decision · {row.orders.length} orders</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{formatElapsed(elapsedMinutes(row.oldestAt))} oldest wait</p>
            </div>
            <Button className="min-h-11 shrink-0" disabled={!row.productId} onClick={() => { setSelected(row); setCapacity(row.units); setPreview(null); setError(''); }}>Bulk Accept</Button>
          </div>
          <Button variant="ghost" className="mt-1 min-h-11 text-muted-foreground" onClick={() => setExpanded(expanded === row.key ? null : row.key)} aria-expanded={expanded === row.key}><ChevronDown className="size-4" />{row.orders.length} contributing orders</Button>
          {expanded === row.key && <ul className="space-y-2 pl-3 text-sm">{[...row.orders].sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(o => <li key={o.id}><strong>#{o.order_number}</strong> · {summarizeItems(o)}</li>)}</ul>}
        </li>;
      })}
    </ul>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open && !mutation.isPending) setSelected(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Accept · {selected?.name}</DialogTitle><DialogDescription>{selected?.units} requested across {selected?.orders.length} orders. Complete orders only; other items in each selected order are also accepted. Totals and payments stay unchanged.</DialogDescription></DialogHeader>
        <label htmlFor="accept-capacity" className="text-sm font-medium">Maximum {selected?.name} units</label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-11" aria-label="Decrease acceptance quantity" disabled={mutation.isPending || capacity <= 1} onClick={() => changeQuantity(capacity - 1)}><Minus className="size-4" /></Button>
          <Input id="accept-capacity" type="number" min={1} max={selected?.units} step={1} value={Number.isNaN(capacity) ? '' : capacity} onChange={e => changeQuantity(e.target.valueAsNumber)} disabled={mutation.isPending} className="h-11 min-w-0 flex-1 text-center text-xl" />
          <Button variant="outline" size="icon" className="size-11" aria-label="Increase acceptance quantity" disabled={mutation.isPending || capacity >= (selected?.units ?? 0)} onClick={() => changeQuantity(capacity + 1)}><Plus className="size-4" /></Button>
          <Button variant="secondary" className="min-h-11" disabled={mutation.isPending} onClick={() => changeQuantity(selected?.units ?? 1)}>All</Button>
        </div>
        {!valid && <p className="text-sm text-destructive">Enter a positive whole number up to {selected?.units}.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {preview && <div className="space-y-3 border-t border-border pt-3" aria-live="polite">
          <p className="font-semibold">{preview.quantity} units · {preview.orders.length} complete orders</p>
          {preview.quantity !== capacity && <p className="text-sm text-muted-foreground">FIFO whole orders fit {preview.quantity}, not {capacity}. {preview.remaining} units remain pending.</p>}
          {preview.quantity === capacity && <p className="text-sm text-muted-foreground">{preview.remaining} units remain pending.</p>}
          <ul className="max-h-56 space-y-3 overflow-y-auto">{preview.orders.map(o => <li key={o.id} className="text-sm"><strong>#{o.orderNumber}</strong><ul>{o.items.map(i => <li key={i.id} className="break-words text-muted-foreground">{i.name} × {i.quantity}</li>)}</ul></li>)}</ul>
          {!preview.quantity && <p className="text-sm text-destructive">Increase capacity to fit the oldest complete order.</p>}
        </div>}
        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => setSelected(null)}>Cancel</Button>
          {!preview ? <Button disabled={!valid || mutation.isPending} onClick={() => void review()}>{mutation.isPending && <Loader2 className="size-4 animate-spin" />}Review allocation</Button> : <Button disabled={!preview.quantity || mutation.isPending} onClick={() => void confirm()}>{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}Confirm {preview.quantity} units</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}