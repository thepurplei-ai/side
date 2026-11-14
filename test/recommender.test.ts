import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addView, rankFeed, type Signals } from '../src/ai/recommender.ts';
import type { Video } from '../src/types.ts';

const NOW = 1_800_000_000_000;
const H = 3600_000;

function v(id: string, creatorId: string, tags: string[], likes = 100, ageH = 10): Video {
  return { id, creatorId, title: id, prompt: id, source: { clip: 'hero' }, likes, shares: 0, remixAllowed: true, tags, visibility: 'public', createdAt: NOW - ageH * H };
}

const empty = (): Signals => ({ liked: {}, saved: {}, following: {}, notInterested: {}, engaged: {}, watch: {}, commentCounts: {} });

const videos = [
  v('space1', 'kai', ['space', 'scifi']),
  v('space2', 'rex', ['space', 'mars']),
  v('xmas1', 'lumi', ['christmas', 'family']),
  v('xmas2', 'nova', ['christmas', 'magic']),
  v('ocean1', 'lumi', ['ocean', 'calm']),
  v('hero1', 'nova', ['superhero', 'action']),
];

test('new user: popular and fresh videos first', () => {
  const vids = [v('old', 'a', ['x'], 100, 200), v('popular', 'b', ['y'], 50000, 10), v('new', 'c', ['z'], 100, 1)];
  const order = rankFeed(vids, empty(), { now: NOW, explore: 0 }).map((x) => x.id);
  assert.equal(order[order.length - 1], 'old');
});

test('liking space videos brings other space videos up', () => {
  const s = empty();
  s.liked.space1 = true;
  s.watch.space1 = addView(undefined, 6000, 6, NOW - H);
  const order = rankFeed(videos, s, { now: NOW, explore: 0 }).map((x) => x.id);
  assert.equal(order[0], 'space2');
});

test('skipped and "not interested" videos go down or disappear', () => {
  const s = empty();
  s.notInterested.hero1 = true;
  s.watch.xmas1 = addView(addView(undefined, 500, 6, NOW - H), 400, 6, NOW - H);
  const order = rankFeed(videos, s, { now: NOW, explore: 0 }).map((x) => x.id);
  assert.ok(!order.includes('hero1'));
  assert.equal(order[order.length - 1], 'xmas1');
});

test('never the same creator twice in a row when avoidable', () => {
  const s = empty();
  s.following.lumi = true;
  const order = rankFeed(videos, s, { now: NOW });
  for (let i = 1; i < order.length; i++) assert.notEqual(order[i].creatorId, order[i - 1].creatorId, order.map((x) => x.id).join());
});

test('exploration keeps something new in the feed', () => {
  const s = empty();
  for (const id of ['space1', 'space2']) {
    s.liked[id] = true;
    s.watch[id] = addView(undefined, 12000, 6, NOW - 30 * H);
  }
  const order = rankFeed(videos, s, { now: NOW, explore: 0.5 }).map((x) => x.id);
  assert.ok(['xmas1', 'xmas2', 'ocean1', 'hero1'].includes(order[1]), order.join());
});

test('watch stats', () => {
  const skip = addView(undefined, 800, 6, NOW);
  assert.equal(skip.skips, 1);
  const full = addView(skip, 12000, 6, NOW);
  assert.equal(full.views, 2);
  assert.equal(full.bestCompletion, 2);
  assert.equal(full.skips, 1);
});

test('same seed gives the same order', () => {
  const a = rankFeed(videos, empty(), { now: NOW, seed: 'x' }).map((x) => x.id);
  const b = rankFeed(videos, empty(), { now: NOW, seed: 'x' }).map((x) => x.id);
  assert.deepEqual(a, b);
});
