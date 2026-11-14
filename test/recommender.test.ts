import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addView, buildTaste, cosine, fingerprints, rankFeed, scoreAll, tokens, type Signals } from '../src/ai/recommender.ts';
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

test('variety: a strong taste still leaves room for other topics near the top', () => {
  const s = empty();
  for (const id of ['space1', 'space2']) {
    s.liked[id] = true;
    s.watch[id] = addView(undefined, 12000, 6, NOW - 30 * H);
  }
  const order = rankFeed(videos, s, { now: NOW }).map((x) => x.id);
  assert.ok(order.slice(0, 3).some((id) => !id.startsWith('space')), order.join());
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

test('words: common words dropped, plurals merged', () => {
  assert.deepEqual(tokens('I am flying over the planets and the planet'), ['flying', 'planet', 'planet']);
});

test('fingerprints: similar stories are closer than different ones', () => {
  const vids = [
    { ...v('a', 'x', ['space']), prompt: 'astronaut lands on mars and finds a cave' },
    { ...v('b', 'y', ['space']), prompt: 'astronaut explores a red mars canyon' },
    { ...v('c', 'z', ['christmas']), prompt: 'santa rides a sleigh over snowy roofs' },
  ];
  const fps = fingerprints(vids);
  assert.ok(cosine(fps.get('a')!, fps.get('b')!) > cosine(fps.get('a')!, fps.get('c')!));
});

test('right-now taste: what you just loved counts more than what you loved days ago', () => {
  const s = empty();
  s.liked.xmas1 = true;
  s.watch.xmas1 = addView(undefined, 12000, 6, NOW - 5 * 24 * H); // days ago
  s.liked.space1 = true;
  s.watch.space1 = addView(undefined, 12000, 6, NOW - 5 * 60_000); // 5 minutes ago
  const fps = fingerprints(videos);
  const taste = buildTaste(videos, fps, s, NOW);
  assert.ok(cosine(taste.vector, fps.get('space2')!) > cosine(taste.vector, fps.get('xmas2')!));
});

test('bandit: topics you keep skipping fade away', () => {
  const s = empty();
  for (const id of ['xmas1', 'xmas2']) s.watch[id] = addView(addView(undefined, 300, 6, NOW - H), 300, 6, NOW - H);
  let below = 0;
  for (let i = 0; i < 20; i++) {
    const parts = new Map(scoreAll(videos, s, { now: NOW, seed: String(i) }).map((x) => [x.video.id, x.parts]));
    if (parts.get('xmas1')!.discovery < parts.get('ocean1')!.discovery) below++;
  }
  assert.ok(below >= 15, `skipped topic scored lower in ${below}/20 runs`);
});

test('mixing continues smoothly from what was just shown', () => {
  const s = empty();
  const order = rankFeed(videos.filter((x) => x.id !== 'hero1'), s, { now: NOW, context: [videos.find((x) => x.id === 'hero1')!] });
  assert.notEqual(order[0].creatorId, 'nova');
});

test('swiping back to a clip counts as liking it', () => {
  const s = empty();
  s.rewatched = { space1: true };
  s.watch.space1 = addView(undefined, 6000, 6, NOW - H);
  const order = rankFeed(videos, s, { now: NOW }).map((x) => x.id).filter((id) => id !== 'space1');
  assert.equal(order[0], 'space2');
});

test('fresh mood: after quick skips, the feed leans away from the usual taste', () => {
  const s = empty();
  for (const id of ['space1', 'space2']) {
    s.liked[id] = true;
    s.watch[id] = addView(undefined, 12000, 6, NOW - 30 * H);
  }
  const pool = [...videos, { ...videos[0], id: 'space3', creatorId: 'zed', title: 'mars rocket', prompt: 'space mars rocket' }];
  let normal = 0;
  let fresh = 0;
  for (let i = 0; i < 30; i++) {
    normal += rankFeed(pool, s, { now: NOW, seed: String(i) }).findIndex((x) => x.id === 'space3');
    fresh += rankFeed(pool, s, { now: NOW, seed: String(i), mood: 'fresh' }).findIndex((x) => x.id === 'space3');
  }
  assert.ok(fresh > normal, `average place: normal ${normal / 30}, fresh ${fresh / 30}`);
});
