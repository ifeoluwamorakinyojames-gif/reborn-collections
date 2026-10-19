import test from 'node:test';
import assert from 'node:assert/strict';
import { productIdFromPath, productPath, productSlug } from '../src/product-links.ts';

test('ad URL keeps the stable Sanity ID, with a readable product name', () => {
  assert.equal(productPath({ id: 'product-abc_12', name: 'Denim Joggers 2XL' }),
    '/product/product-abc_12/denim-joggers-2xl');
  assert.equal(productIdFromPath('/product/product-abc_12/denim-joggers-2xl'), 'product-abc_12');
});

test('changing product name does not change the ID used to find it', () => {
  assert.equal(productIdFromPath(productPath({ id: 'abc123', name: 'Old Name' })), 'abc123');
  assert.equal(productIdFromPath(productPath({ id: 'abc123', name: 'New Name' })), 'abc123');
});

test('unsafe and unrelated paths do not match products', () => {
  assert.equal(productIdFromPath('/'), null);
  assert.equal(productIdFromPath('/collection/women'), null);
  assert.equal(productIdFromPath('/product/'), null);
  assert.equal(productIdFromPath('/product/123/slug/extra'), null);
  assert.equal(productIdFromPath('/product/%3Cscript%3E/item'), null);
  assert.equal(productSlug('Turkish Polo / XL'), 'turkish-polo-xl');
});
