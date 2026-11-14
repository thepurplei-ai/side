import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, SwipeSession } from '../src/ai/swipe.ts';

const T = 1_800_000_000_000;

test('classify: skip, glance, watched, rewatch', () => {
  assert.equal(classify({ index: 0, videoId: 'a', enteredAt: T, leftAt: T + 800, durationSec: 6, back: false }), 'skip');
  assert.equal(classify({ index: 0, videoId: 'a', enteredAt: T, leftAt: T + 3000, leftAtTime: 3, durationSec: 6, back: false }), 'glance');
  assert.equal(classify({ index: 0, videoId: 'a', enteredAt: T, leftAt: T + 6000, leftAtTime: 5.5, durationSec: 6, back: false }), 'watched');
  assert.equal(classify({ index: 0, videoId: 'a', enteredAt: T, leftAt: T + 4000, durationSec: 6, back: true }), 'rewatch');
});

test('enter() reports how the previous clip was left', () => {
  const s = new SwipeSession();
  assert.equal(s.enter(0, 'a', 6, T), undefined);
  assert.equal(s.enter(1, 'b', 6, T + 700, 0.7), 'skip');
  assert.equal(s.enter(2, 'c', 6, T + 7000, 5.9), 'watched');
  assert.equal(s.enter(1, 'b', 6, T + 9000, 2), 'glance');
  assert.equal(s.enter(2, 'c', 6, T + 13000, 4), 'rewatch'); // b was revisited by swiping back
});

test('three quick skips in a row switch to fresh mode', () => {
  const s = new SwipeSession();
  let t = T;
  s.enter(0, 'a', 6, t);
  s.enter(1, 'v1', 6, (t += 6000), 5.8); // watched 'a'
  s.enter(2, 'v2', 6, (t += 600), 0.5); // skipped v1
  s.enter(3, 'v3', 6, (t += 600), 0.5); // skipped v2
  assert.equal(s.mood(), 'normal');
  s.enter(4, 'v4', 6, (t += 600), 0.5); // skipped v3
  assert.equal(s.skipStreak(), 3);
  assert.equal(s.mood(), 'fresh');
  s.enter(5, 'v5', 6, (t += 6000), 5.8); // watched one: back to normal
  assert.equal(s.mood(), 'normal');
});

test('fast swiping loads further ahead; swiping back keeps more behind', () => {
  const s = new SwipeSession();
  assert.deepEqual(s.preloadRange(5, 20), { from: 4, to: 6 });
  let t = T;
  s.enter(0, 'a', 6, t);
  for (let i = 1; i <= 5; i++) s.enter(i, `v${i}`, 6, (t += 900), 0.9);
  assert.deepEqual(s.preloadRange(5, 20), { from: 4, to: 8 });
  const b = new SwipeSession();
  b.enter(5, 'a', 6, T);
  b.enter(4, 'b', 6, T + 5000, 5);
  b.enter(5, 'a', 6, T + 10000, 5);
  b.enter(4, 'b', 6, T + 15000, 5);
  assert.equal(b.preloadRange(4, 20).from, 2);
});

test('resume where you left off, only if recent and not finished', () => {
  const s = new SwipeSession();
  s.enter(0, 'a', 10, T);
  s.enter(1, 'b', 10, T + 4000, 4);
  assert.equal(s.resumeTime('a', T + 6000), 4);
  assert.equal(s.resumeTime('a', T + 10 * 60_000), 0); // too long ago
  const f = new SwipeSession();
  f.enter(0, 'a', 10, T);
  f.enter(1, 'b', 10, T + 9800, 9.8);
  assert.equal(f.resumeTime('a', T + 10000), 0); // already finished
});
