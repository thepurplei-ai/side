// The "For You" algorithm: decides the order of videos in the Home feed.
//
// It learns from what you do on this phone:
//   - how long you watch each video (watching to the end or replaying = you liked it,
//     swiping away in the first second or two = you didn't),
//   - likes, saves, comments, shares and follows,
//   - "Not interested".
// From that it builds your interests (tags and creators) and scores every video:
//   score = your interest in it + how good it is for everyone + how new it is
//           - penalties for things you've already seen or skipped.
// Then it mixes the list so the same creator or topic doesn't repeat back-to-back, and
// it saves a few spots for new things so your feed doesn't get stuck in a bubble.
//
// Pure TypeScript with no app imports: tested by `npm test`. Later the same scoring can run
// on the server with signals from everyone.

import type { Video } from '../types';

export interface WatchStat {
  /** Times the video was on screen. */
  views: number;
  /** Total time watched, in milliseconds. */
  watchedMs: number;
  /** Best share of the video watched in one view (1 = to the end, 2 = watched twice). */
  bestCompletion: number;
  /** Views that were swiped away almost at once. */
  skips: number;
  lastSeenAt: number;
}

export interface Signals {
  liked: Record<string, true>;
  saved: Record<string, true>;
  following: Record<string, true>;
  notInterested: Record<string, true>;
  /** Videos you commented on or shared. */
  engaged: Record<string, true>;
  watch: Record<string, WatchStat>;
  /** Number of comments on each video. */
  commentCounts: Record<string, number>;
}

export interface Interests {
  tags: Record<string, number>;
  creators: Record<string, number>;
}

/** A view shorter than this (and under 25% of the video) counts as a skip. */
export const SKIP_MS = 1500;

const HOUR = 3600_000;

/** How much one video tells us about your taste, from -1 (disliked) to about +3 (loved). */
export function affinity(videoId: string, s: Signals): number {
  if (s.notInterested[videoId]) return -2;
  let a = 0;
  const w = s.watch[videoId];
  if (w) {
    if (w.bestCompletion >= 1.5) a += 1.2; // replayed
    else if (w.bestCompletion >= 0.9) a += 0.8; // watched to the end
    else if (w.bestCompletion >= 0.5) a += 0.3;
    if (w.skips > 0 && w.skips >= w.views) a -= 0.6; // always swiped away
  }
  if (s.liked[videoId]) a += 1;
  if (s.saved[videoId]) a += 1.2;
  if (s.engaged[videoId]) a += 0.8;
  return a;
}

/** Builds your interest profile (tags and creators) from everything you did. */
export function buildInterests(videos: Video[], s: Signals): Interests {
  const tags: Record<string, number> = {};
  const creators: Record<string, number> = {};
  for (const v of videos) {
    const a = affinity(v.id, s);
    if (a === 0) continue;
    for (const t of v.tags) tags[t] = (tags[t] ?? 0) + a;
    creators[v.creatorId] = (creators[v.creatorId] ?? 0) + a;
  }
  for (const id of Object.keys(s.following)) creators[id] = (creators[id] ?? 0) + 2;
  return { tags, creators };
}

/** Squashes any number into -1..1 so one strong signal can't dominate. */
function squash(x: number): number {
  return x / (1 + Math.abs(x));
}

/** How good a video is for everyone: likes, shares and comments, with diminishing returns. */
export function quality(v: Video, commentCount: number): number {
  return Math.log10(1 + v.likes + 3 * v.shares + 5 * commentCount) / 6; // ~0..1
}

/** New videos get a boost that halves every 36 hours. */
export function freshness(v: Video, now: number): number {
  const ageH = Math.max(0, (now - v.createdAt) / HOUR);
  return Math.pow(0.5, ageH / 36);
}

export interface ScoreParts {
  interest: number;
  quality: number;
  fresh: number;
  seenPenalty: number;
  total: number;
}

export function scoreVideo(v: Video, s: Signals, interests: Interests, now: number, meId?: string): ScoreParts {
  const tagScore = v.tags.length ? v.tags.reduce((sum, t) => sum + (interests.tags[t] ?? 0), 0) / Math.sqrt(v.tags.length) : 0;
  const creatorScore = interests.creators[v.creatorId] ?? 0;
  const interest = 0.6 * squash(tagScore / 2) + 0.4 * squash(creatorScore / 2);
  const q = quality(v, s.commentCounts[v.id] ?? 0);
  const fresh = freshness(v, now);

  // Already seen: push it down, less so as time passes. Skipped: push it down more.
  let seenPenalty = 0;
  const w = s.watch[v.id];
  if (w) {
    const hoursSince = (now - w.lastSeenAt) / HOUR;
    const recency = Math.pow(0.5, hoursSince / 24);
    seenPenalty += 0.5 * recency + 0.15 * Math.min(w.views, 4);
    seenPenalty += 0.4 * Math.min(w.skips, 3);
  }
  if (meId && v.creatorId === meId) seenPenalty += 0.6; // your own videos live on your profile
  if (s.notInterested[v.id]) seenPenalty += 10;

  const total = 1.4 * interest + 0.8 * q + 0.5 * fresh - seenPenalty;
  return { interest, quality: q, fresh, seenPenalty, total };
}

/** Small, repeatable random number from a string (so tests and refreshes are predictable). */
function hashRandom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export interface RankOptions {
  now: number;
  meId?: string;
  /** Changes on every refresh so the order shuffles a little. */
  seed?: string;
  /** Share of spots kept for things outside your usual interests (0..1). */
  explore?: number;
}

/**
 * Orders the feed. Videos you said "Not interested" to are removed.
 * Diversity rule: never the same creator twice in a row, and never three in a row
 * with the same main tag, unless nothing else is left.
 */
export function rankFeed(videos: Video[], s: Signals, opts: RankOptions): Video[] {
  const { now, meId, seed = '', explore = 0.2 } = opts;
  const interests = buildInterests(videos, s);
  const scored = videos
    .filter((v) => !s.notInterested[v.id])
    .map((v) => {
      const parts = scoreVideo(v, s, interests, now, meId);
      // A little noise so equal videos don't always come in the same order.
      return { v, parts, score: parts.total + 0.08 * hashRandom(seed + v.id) };
    })
    .sort((a, b) => b.score - a.score);

  // Exploration: the best "outside your interests" videos get every Nth spot.
  const exploreEvery = explore > 0 ? Math.max(2, Math.round(1 / explore)) : Infinity;
  const isExplore = (x: (typeof scored)[number]) => x.parts.interest <= 0.05 && !s.watch[x.v.id];

  const out: Video[] = [];
  const pool = [...scored];
  while (pool.length) {
    const prev = out[out.length - 1];
    const prev2 = out[out.length - 2];
    const wantExplore = (out.length + 1) % exploreEvery === 0;
    const fits = (x: (typeof scored)[number]) =>
      (!prev || x.v.creatorId !== prev.creatorId) &&
      !(prev && prev2 && x.v.tags[0] && x.v.tags[0] === prev.tags[0] && x.v.tags[0] === prev2.tags[0]);
    let idx = wantExplore ? pool.findIndex((x) => isExplore(x) && fits(x)) : -1;
    if (idx < 0) idx = pool.findIndex(fits);
    if (idx < 0) idx = 0; // nothing fits the rules: take the best one left
    out.push(pool.splice(idx, 1)[0].v);
  }
  return out;
}

/** Adds one view to the watch stats. */
export function addView(prev: WatchStat | undefined, watchedMs: number, durationSec: number, now: number): WatchStat {
  const completion = durationSec > 0 ? watchedMs / 1000 / durationSec : 0;
  const skipped = watchedMs < SKIP_MS && completion < 0.25;
  return {
    views: (prev?.views ?? 0) + 1,
    watchedMs: (prev?.watchedMs ?? 0) + watchedMs,
    bestCompletion: Math.max(prev?.bestCompletion ?? 0, Math.round(completion * 100) / 100),
    skips: (prev?.skips ?? 0) + (skipped ? 1 : 0),
    lastSeenAt: now,
  };
}
