import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionSlug, effectivePrice, phoneNumber } from '../src/storefront.ts';

test('sale price is used only when positive and below retail', () => {
  assert.equal(effectivePrice({ price: 24000, salePrice: 19000 }), 19000);
  assert.equal(effectivePrice({ price: 24000, salePrice: 25000 }), 24000);
  assert.equal(effectivePrice({ price: 24000, salePrice: 0 }), 24000);
  assert.equal(effectivePrice({ price: 24000 }), 24000);
});

test('WhatsApp links use an international Nigerian number', () => {
  assert.equal(phoneNumber('0906 075 9664'), '2349060759664');
  assert.equal(phoneNumber('+234 906 075 9664'), '2349060759664');
  assert.equal(phoneNumber('2349060759664'), '2349060759664');
});

test('collection paths are predictable', () => {
  assert.equal(collectionSlug(' Baggy Jean '), 'baggy-jean');
  assert.equal(collectionSlug('Women'), 'women');
});
