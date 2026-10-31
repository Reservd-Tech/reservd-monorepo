import { describe, expect, test } from 'bun:test';
import { incomingDemand, allocateWholeOrders } from '../src/lib/pos/acceptance';
import { aggregateProduction } from '../src/lib/pos/production';
import type { OrderWithItems } from '../src/lib/pos/types';

function order(n: number, qty: number, status = 'pending'): OrderWithItems {
  return { id: `o${n}`, order_number: n, status, archived_at: null, created_at: `2026-10-28T08:0${n}:00Z`, order_items: [
    { id: `d${n}`, product_id: 'dosa', product_name: 'Dosa', quantity: qty, quantity_preparing: 0, quantity_prepared: 0 },
    { id: `t${n}`, product_id: 'tea', product_name: 'Tea', quantity: 1, quantity_preparing: 0, quantity_prepared: 0 },
  ] } as unknown as OrderWithItems;
}
const demand = () => incomingDemand([order(1,4),order(2,3),order(3,5),order(4,2)]).find(r=>r.key==='dosa');
describe('Rush acceptance capacity', () => {
  test('4,3,5,2 with capacity 7 accepts exactly the first two complete orders', () => {
    const row=demand(); if (!row) throw new Error('Missing demand');
    const result=allocateWholeOrders(row,7);
    expect(result.quantity).toBe(7); expect(result.orders.map(o=>o.id)).toEqual(['o1','o2']);
  });
  test('capacity 6 previews 4, never exceeding capacity or skipping the next oldest order', () => {
    const row=demand(); if (!row) throw new Error('Missing demand');
    expect(allocateWholeOrders(row,6).quantity).toBe(4);
  });
  test('capacity below oldest complete order allocates nothing', () => {
    const row=demand(); if (!row) throw new Error('Missing demand'); expect(allocateWholeOrders(row,3).quantity).toBe(0);
  });
  test('positive integer capacity cannot exceed demand', () => {
    const row=demand(); if (!row) throw new Error('Missing demand');
    for (const q of [0,-1,1.5,15]) expect(allocateWholeOrders(row,q).quantity).toBe(0);
  });
  test('mixed orders retain unrelated lines in whole-order fallback', () => {
    const row=demand(); if (!row) throw new Error('Missing demand'); expect(allocateWholeOrders(row,4).orders[0].order_items[1].product_id).toBe('tea');
  });
  test('accepted cancelled completed ready and archived orders are excluded', () => {
    const archived={...order(6,9),archived_at:'2026-10-28T10:00:00Z'};
    expect(incomingDemand([order(1,4),order(2,3,'preparing'),order(3,5,'cancelled'),order(4,2,'completed'),order(5,8,'ready'),archived]).find(r=>r.key==='dosa')?.units).toBe(4);
  });
  test('multiple same-product lines count units once and the order once', () => {
    const o=order(1,4); o.order_items.push({...o.order_items[0],id:'extra',quantity:3});
    const row=incomingDemand([o]).find(r=>r.key==='dosa'); expect(row?.units).toBe(7); expect(row?.orders.length).toBe(1);
  });
  test('pending demand enters production once only after acceptance, without starting preparation', () => {
    const o=order(1,4); expect(aggregateProduction([o])).toHaveLength(0);
    const accepted={...o,status:'preparing' as const}; const line=aggregateProduction([accepted]).find(r=>r.key==='dosa');
    expect(line?.remaining).toBe(4); expect(line?.preparing).toBe(0);
  });
});