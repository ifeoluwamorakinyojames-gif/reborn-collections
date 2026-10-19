import test from 'node:test';
import assert from 'node:assert/strict';
import { imageSrcSet, imageUrl } from '../src/image.ts';

test('Sanity originals become width-limited, auto-format images', () => {
  const url = imageUrl('https://cdn.sanity.io/images/abc123/production/pic.jpg', 480);
  assert.equal(new URL(url).searchParams.get('w'), '480');
  assert.equal(new URL(url).searchParams.get('auto'), 'format');
  assert.equal(new URL(url).searchParams.get('fit'), 'max');
  assert.equal(new URL(url).searchParams.get('q'), '75');
});

test('external or missing images are not rewritten', () => {
  assert.equal(imageUrl('https://images.example.com/pic.jpg', 480), 'https://images.example.com/pic.jpg');
  assert.equal(imageUrl('', 480), '/reborn-icon.svg');
  assert.equal(imageSrcSet('https://example.com/img.jpg', [320, 640]), undefined);
});

test('responsive Sanity srcSet has correct width descriptors', () => {
  const set = imageSrcSet('https://cdn.sanity.io/images/abc123/production/pic.png', [320, 640]);
  assert.match(set || '', /w=320.* 320w/);
  assert.match(set || '', /w=640.* 640w/);
});
