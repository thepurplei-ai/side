import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insights, knownFor, sortProfileClips, suggestCreators, tasteMatch } from '../src/ai/profile.ts';
import { addView, type Signals } from '../src/ai/recommender.ts';
import type { User, Video } from '../src/types.ts';

const NOW = 1_800_000_000_000;
const H = 3600_000;
const v = (id: string, creatorId: string, tags: string[], likes: number, ageH: number, extra: Partial<Video> = {}): Video => ({
  id, creatorId, title: id, prompt: tags.join(' '), source: { clip: 'hero' }, likes, shares: 0, remixAllowed: true, tags, visibility: 'public', createdAt: NOW - ageH * H, ...extra,
});
const u = (id: string, followers = 100): User => ({ id, username: id, displayName: id, avatarColor: '#000', bio: '', followers });
const empty = (): Signals => ({ liked: {}, saved: {}, following: {}, notInterested: {}, engaged: {}, watch: {}, commentCounts: {} });

const clips = [v('old-hit', 'a', ['space'], 900, 24 * 60), v('new-good', 'a', ['space'], 700, 5), v('newest', 'a', ['ocean'], 3, 1)];
const ctx = { now: NOW, commentCounts: {}, remixes: { newest: 4 } };

test('sorting: latest, top and most remixed', () => {
  assert.deepEqual(sortProfileClips(clips, 'latest', ctx).map((x) => x.id), ['newest', 'new-good', 'old-hit']);
  assert.equal(sortProfileClips(clips, 'top', ctx)[0].id, 'new-good'); // strong and recent beats old
  assert.equal(sortProfileClips(clips, 'remixed', ctx)[0].id, 'newest');
});

test('pinned clips come first', () => {
  assert.equal(sortProfileClips(clips, 'top', { ...ctx, pinned: { 'old-hit': true } })[0].id, 'old-hit');
});

test('insights: totals, best clip and level', () => {
  const all = [...clips, v('r1', 'b', ['ocean'], 1, 1, { remixOfId: 'old-hit' })];
  const i = insights(u('a', 5000), clips, [], all);
  assert.equal(i.likes, 1603);
  assert.equal(i.remixes, 1);
  assert.equal(i.bestClipId, 'old-hit');
  assert.equal(i.level, 'Popular');
  assert.equal(insights(u('z', 0), [], [], all).level, 'New');
});

test('known for', () => {
  assert.equal(knownFor(clips, 1)[0], 'space');
});

const world = [
  v('s1', 'kai', ['space', 'mars'], 50, 5), v('s2', 'kai', ['space', 'rocket'], 50, 5),
  v('s3', 'rex', ['space', 'mars'], 50, 5),
  v('x1', 'lumi', ['christmas', 'santa'], 50, 5),
];
const users = [u('kai'), u('rex'), u('lumi', 90000), u('me')];

test('similar creators: space fans find space creators', () => {
  assert.equal(suggestCreators(users, world, empty(), { now: NOW, like: 'kai', meId: 'me' })[0].id, 'rex');
});

test('people you may like follows your taste, and skips people you follow', () => {
  const s = empty();
  s.liked.s1 = true;
  s.watch.s1 = addView(undefined, 12000, 6, NOW - H);
  assert.equal(suggestCreators(users, world, s, { now: NOW, meId: 'me' })[0].id, 'rex');
  s.following.rex = true;
  assert.ok(!suggestCreators(users, world, s, { now: NOW, meId: 'me' }).some((x) => x.id === 'rex'));
});

test('taste match', () => {
  const s = empty();
  assert.equal(tasteMatch('rex', world, s, NOW), undefined);
  s.liked.s1 = true;
  assert.ok(tasteMatch('rex', world, s, NOW)! > tasteMatch('lumi', world, s, NOW)!);
});
