import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canRateFood, foodRatingSchema, ratingSummary, sortTopRated } from './ratings';

describe('food rating rules', () => {
  it('allows ratings only after the order is completed', () => {
    assert.equal(canRateFood({ status: 'completed', rating_token: 'vendor-capability' }, { rating: null }), true);
    for (const status of ['pending', 'preparing', 'ready', 'cancelled']) {
      assert.equal(canRateFood({ status, rating_token: 'vendor-capability' }, { rating: null }), false);
    }
  });
  it('does not allow cancelled orders, missing vendor support or a second vote', () => {
    assert.equal(canRateFood({ status: 'cancelled', rating_token: 'vendor-capability' }, {}), false);
    assert.equal(canRateFood({ status: 'completed' }, {}), false);
    assert.equal(canRateFood({ status: 'completed', rating_token: 'vendor-capability' }, { rating: 4 }), false);
  });
  it('accepts only integer food ratings from one through five', () => {
    const input = { orderId: '11111111-1111-4111-8111-111111111111', itemId: '22222222-2222-4222-8222-222222222222', token: 'test-only-token-with-at-least-32-characters' };
    for (const rating of [1, 2, 3, 4, 5]) assert.equal(foodRatingSchema.safeParse({ ...input, rating }).success, true);
    for (const rating of [0, 6, 2.5, '5']) assert.equal(foodRatingSchema.safeParse({ ...input, rating }).success, false);
    assert.equal(foodRatingSchema.safeParse({ ...input, rating: 5, token: '' }).success, false);
  });
  it('allows optional comments with at most 500 characters', () => {
    const input = { orderId: '11111111-1111-4111-8111-111111111111', itemId: '22222222-2222-4222-8222-222222222222', token: 'test-only-token-with-at-least-32-characters', rating: 5 };
    assert.equal(foodRatingSchema.safeParse(input).success, true);
    assert.equal(foodRatingSchema.safeParse({ ...input, comment: 'a'.repeat(500) }).success, true);
    assert.equal(foodRatingSchema.safeParse({ ...input, comment: 'a'.repeat(501) }).success, false);
  });
  it('exposes only real positive-count summaries', () => {
    assert.deepEqual(ratingSummary({ avg_rating: 4.6, rating_count: 23 }), { average: 4.6, count: 23 });
    assert.equal(ratingSummary({ avg_rating: 4.8, rating_count: 0 }), null);
    assert.equal(ratingSummary({}), null);
    assert.equal(ratingSummary({ avg_rating: 6, rating_count: 1 }), null);
  });
  it('sorts Top rated by real averages and puts unrated products last without mutating the menu', () => {
    const products = [{ id: 'new' }, { id: 'lower', avg_rating: 4.2, rating_count: 10 }, { id: 'top', avg_rating: 4.6, rating_count: 23 }];
    assert.deepEqual(sortTopRated(products).map(p => p.id), ['top', 'lower', 'new']);
    assert.equal(products[0]?.id, 'new');
  });
});