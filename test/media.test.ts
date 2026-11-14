import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMedia, normalizeDuration, orientation, tagsFromCaption, titleFromCaption } from '../src/services/mediaRules.ts';

test('durations from pickers (ms) and cameras (s)', () => {
  assert.equal(normalizeDuration(12000), 12);
  assert.equal(normalizeDuration(12), 12);
  assert.equal(normalizeDuration(null), undefined);
});

test('media checks', () => {
  assert.equal(checkMedia({ type: 'video', durationSec: 30 }), undefined);
  assert.match(checkMedia({ type: 'video', durationSec: 95 })!, /up to 60 seconds/);
  assert.match(checkMedia({ type: 'video', durationSec: 0.4 })!, /too short/);
  assert.match(checkMedia({ type: 'image', fileSizeBytes: 400 * 1024 * 1024 })!, /too big/);
  assert.equal(checkMedia({ type: 'image', width: 1080, height: 1920 }), undefined);
});

test('orientation', () => {
  assert.equal(orientation({ type: 'video', width: 1920, height: 1080 }), 'landscape');
  assert.equal(orientation({ type: 'video', width: 1080, height: 1920 }), 'portrait');
});

test('tags and title from a caption', () => {
  assert.deepEqual(tagsFromCaption('Sunset run on the beach #Summer #running'), ['summer', 'running', 'sunset', 'beach']);
  assert.equal(titleFromCaption('Sunset run on the beach #summer'), 'Sunset run on the beach');
});
