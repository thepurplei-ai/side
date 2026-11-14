// The "For You" algorithm (version 2): decides the order of videos on the Home page.
//
// How it works, step by step:
//
// 1. Understand each video. Every video becomes a "fingerprint" (a vector): its tags, its creator
//    and the important words in its title and story. Rare words count more than common ones
//    (TF-IDF), so "mars" says more about a video than "the".
//
// 2. Understand you. Everything you do is a signal: watch time (finishing or replaying = good,
//    swiping away in the first second or two = bad), likes, saves, comments, shares, follows and
//    "Not interested". Two taste profiles are built from the fingerprints of those videos:
//      - long-term taste (what you like in general, fades over a few days),
//      - right-now taste (what you're into in this session, fades within the hour).
//    They are blended, so the feed follows your mood without forgetting who you are.
//
// 3. Score every video:
//      relevance  how close its fingerprint is to your taste (cosine similarity),
//      discovery  a "multi-armed bandit" (Thompson sampling): each topic keeps a running count of
//                 hits and misses; topics we know little about get a fair chance to show up,
//                 topics you keep skipping fade away,
//      quality    likes, shares and comments from everyone (with diminishing returns),
//      freshness  new videos get a boost that halves every 36 hours,
//      follows    creators you follow get a boost,
//      penalties  for videos you've just seen, skipped, or marked "Not interested".
//
// 4. Mix the list (MMR, "maximal marginal relevance"): each next video is the best balance of
//    "high score" and "different from the last few videos", and the same creator never appears
//    twice in a row when there's another choice.
//
// The Home page also re-ranks the videos you haven't reached yet after every swipe, so the feed
// adapts while you watch. Pure TypeScript, no app imports: tested by `npm test`.

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

/** A view shorter than this (and under 25% of the video) counts as a skip. */
export const SKIP_MS = 1500;

const HOUR = 3600_000;
const LONG_HALF_LIFE_H = 72;
const SHORT_HALF_LIFE_H = 0.5;

export const WEIGHTS = {
  relevance: 1.3,
  discovery: 0.55,
  quality: 0.6,
  freshness: 0.4,
  follow: 0.35,
  /** MMR balance: 1 = only score, 0 = only variety. */
  mmrLambda: 0.72,
} as const;

// ---------------------------------------------------------------------------------------------
// 1. Fingerprints

export type Vec = Map<string, number>;

const STOP = new Set(
  'a an the and or but of to in on at for with from by is are was be been i me my we our you your it its this that these those then into over under after before up down out as so very just my their they them he she his her what when where who how all some more most no not'.split(
    ' ',
  ),
);

/** Lower-case words without punctuation, very short and very common words removed, simple plurals merged. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

function rawFeatures(v: Video): Vec {
  const f: Vec = new Map();
  const add = (k: string, w: number) => f.set(k, (f.get(k) ?? 0) + w);
  for (const t of v.tags) add(`tag:${t.toLowerCase()}`, 1);
  add(`creator:${v.creatorId}`, 0.6);
  for (const w of tokens(`${v.title} ${v.prompt}`)) add(`word:${w}`, 0.35);
  return f;
}

function norm(v: Vec): number {
  let s = 0;
  for (const x of v.values()) s += x * x;
  return Math.sqrt(s);
}

function normalize(v: Vec): Vec {
  const n = norm(v);
  if (n === 0) return v;
  const out: Vec = new Map();
  for (const [k, x] of v) out.set(k, x / n);
  return out;
}

export function cosine(a: Vec, b: Vec): number {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of small) {
    const y = big.get(k);
    if (y !== undefined) dot += x * y;
  }
  const n = norm(a) * norm(b);
  return n === 0 ? 0 : dot / n;
}

/** Fingerprints for all videos, with rare features weighted up (IDF). */
export function fingerprints(videos: Video[]): Map<string, Vec> {
  const raw = videos.map((v) => [v.id, rawFeatures(v)] as const);
  const df = new Map<string, number>();
  for (const [, f] of raw) for (const k of f.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  const n = raw.length;
  const out = new Map<string, Vec>();
  for (const [id, f] of raw) {
    const w: Vec = new Map();
    for (const [k, x] of f) w.set(k, x * (Math.log((n + 1) / ((df.get(k) ?? 0) + 1)) + 1));
    out.set(id, normalize(w));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// 2. Your taste

/** How much one video tells us about your taste, from -2 (not interested) to about +4 (loved). */
export function affinity(videoId: string, s: Signals): number {
  if (s.notInterested[videoId]) return -2;
  let a = 0;
  const w = s.watch[videoId];
  if (w) {
    if (w.bestCompletion >= 1.5) a += 1.2; // replayed
    else if (w.bestCompletion >= 0.9) a += 0.8; // watched to the end
    else if (w.bestCompletion >= 0.5) a += 0.3;
    if (w.skips > 0 && w.skips >= w.views) a -= 0.7; // always swiped away
  }
  if (s.liked[videoId]) a += 1;
  if (s.saved[videoId]) a += 1.2;
  if (s.engaged[videoId]) a += 0.8;
  return a;
}

export interface Taste {
  vector: Vec;
  /** Topic hits and misses for the bandit: tag → [hits, misses]. */
  topics: Map<string, [number, number]>;
  /** True when we know nothing about you yet. */
  cold: boolean;
}

function decay(hours: number, halfLife: number): number {
  return Math.pow(0.5, Math.max(0, hours) / halfLife);
}

export function buildTaste(videos: Video[], fps: Map<string, Vec>, s: Signals, now: number): Taste {
  const long: Vec = new Map();
  const short: Vec = new Map();
  const topics = new Map<string, [number, number]>();
  let any = false;
  for (const v of videos) {
    const a = affinity(v.id, s);
    if (a === 0) continue;
    any = true;
    const fp = fps.get(v.id);
    const seenAt = s.watch[v.id]?.lastSeenAt ?? now;
    const hours = (now - seenAt) / HOUR;
    const wl = a * decay(hours, LONG_HALF_LIFE_H);
    const ws = a * decay(hours, SHORT_HALF_LIFE_H);
    if (fp) {
      for (const [k, x] of fp) {
        long.set(k, (long.get(k) ?? 0) + wl * x);
        short.set(k, (short.get(k) ?? 0) + ws * x);
      }
    }
    for (const t of v.tags) {
      const cur = topics.get(t) ?? [0, 0];
      if (a > 0) cur[0] += Math.min(a, 2);
      else cur[1] += Math.min(-a, 2);
      topics.set(t, cur);
    }
  }
  for (const id of Object.keys(s.following)) {
    long.set(`creator:${id}`, (long.get(`creator:${id}`) ?? 0) + 1.5);
    any = true;
  }
  // Blend: 60% long-term, 40% right now (each normalised first so neither drowns the other).
  const nl = normalize(long);
  const ns = normalize(short);
  const vector: Vec = new Map();
  for (const [k, x] of nl) vector.set(k, 0.6 * x);
  for (const [k, x] of ns) vector.set(k, (vector.get(k) ?? 0) + 0.4 * x);
  return { vector, topics, cold: !any };
}

// ---------------------------------------------------------------------------------------------
// 3. Scoring

/** Repeatable random numbers from a seed (mulberry32), so a refresh gives a new but stable order. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A sample from a Beta(a, b) distribution (via two Gamma samples). */
function sampleBeta(a: number, b: number, rnd: () => number): number {
  const x = sampleGamma(a, rnd);
  const y = sampleGamma(b, rnd);
  return x / (x + y);
}

/** Marsaglia–Tsang Gamma sampler (shape >= 1; boosted for smaller shapes). */
function sampleGamma(shape: number, rnd: () => number): number {
  if (shape < 1) return sampleGamma(shape + 1, rnd) * Math.pow(rnd() || 1e-9, 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      // Box–Muller normal sample.
      const u1 = rnd() || 1e-9;
      const u2 = rnd();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rnd() || 1e-9;
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}

/** How good a video is for everyone: likes, shares and comments, with diminishing returns (~0..1). */
export function quality(v: Video, commentCount: number): number {
  return Math.min(1, Math.log10(1 + v.likes + 3 * v.shares + 5 * commentCount) / 6);
}

/** New videos get a boost that halves every 36 hours. */
export function freshness(v: Video, now: number): number {
  return decay((now - v.createdAt) / HOUR, 36);
}

export interface ScoreParts {
  relevance: number;
  discovery: number;
  quality: number;
  fresh: number;
  follow: number;
  penalty: number;
  total: number;
}

function seenPenalty(v: Video, s: Signals, now: number, meId?: string): number {
  let p = 0;
  const w = s.watch[v.id];
  if (w) {
    // Just watched: strongly pushed down, fading over about a day.
    p += 1.6 * decay((now - w.lastSeenAt) / HOUR, 8) + 0.12 * Math.min(w.views, 5);
    p += 0.45 * Math.min(w.skips, 3);
  }
  if (meId && v.creatorId === meId) p += 0.6; // your own videos live on your profile
  if (s.notInterested[v.id]) p += 10;
  return p;
}

export function scoreAll(videos: Video[], s: Signals, opts: { now: number; meId?: string; seed?: string }) {
  const { now, meId, seed = '' } = opts;
  const fps = fingerprints(videos);
  const taste = buildTaste(videos, fps, s, now);
  const rnd = seededRandom(`side:${seed}`);
  return videos.map((v) => {
    const fp = fps.get(v.id) ?? new Map();
    const relevance = taste.cold ? 0 : cosine(taste.vector, fp);
    // Bandit: sample how much you'd like each of the video's topics; average them.
    const samples = (v.tags.length ? v.tags : ['_none']).map((t) => {
      const [hits, misses] = taste.topics.get(t) ?? [0, 0];
      return sampleBeta(1 + hits, 1 + misses, rnd);
    });
    const discovery = samples.reduce((a, b) => a + b, 0) / samples.length - 0.5; // -0.5..0.5
    const q = quality(v, s.commentCounts[v.id] ?? 0);
    const fresh = freshness(v, now);
    const follow = s.following[v.creatorId] ? 1 : 0;
    const penalty = seenPenalty(v, s, now, meId);
    const total =
      WEIGHTS.relevance * relevance +
      WEIGHTS.discovery * discovery +
      WEIGHTS.quality * q +
      WEIGHTS.freshness * fresh +
      WEIGHTS.follow * follow -
      penalty;
    const parts: ScoreParts = { relevance, discovery, quality: q, fresh, follow, penalty, total };
    return { video: v, fp, parts };
  });
}

// ---------------------------------------------------------------------------------------------
// 4. Mixing

export interface RankOptions {
  now: number;
  meId?: string;
  /** Changes on every refresh so the order shuffles a little. */
  seed?: string;
  /** The last few videos already shown, so the mix continues smoothly from them. */
  context?: Video[];
  /** 1 = only score, 0 = only variety. Default WEIGHTS.mmrLambda. */
  lambda?: number;
}

/** Orders the feed. Videos you said "Not interested" to are removed. */
export function rankFeed(videos: Video[], s: Signals, opts: RankOptions): Video[] {
  const lambda = opts.lambda ?? WEIGHTS.mmrLambda;
  const scored = scoreAll(
    videos.filter((v) => !s.notInterested[v.id]),
    s,
    opts,
  );
  // Scores are rescaled to 0..1 so they mix fairly with similarity (also 0..1).
  const totals = scored.map((x) => x.parts.total);
  const lo = Math.min(...totals);
  const hi = Math.max(...totals);
  const scale = (t: number) => (hi > lo ? (t - lo) / (hi - lo) : 0.5);

  const ctxFps = opts.context?.length ? fingerprints([...(opts.context ?? []), ...videos]) : undefined;
  const shown: { creatorId: string; fp: Vec }[] = (opts.context ?? []).slice(-3).map((v) => ({
    creatorId: v.creatorId,
    fp: ctxFps?.get(v.id) ?? new Map(),
  }));

  const pool = [...scored];
  const out: Video[] = [];
  while (pool.length) {
    const recent = shown.slice(-3);
    const last = shown[shown.length - 1];
    let best = -1;
    let bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const x = pool[i];
      if (last && x.video.creatorId === last.creatorId && pool.some((y) => y.video.creatorId !== last.creatorId)) continue;
      const fp = ctxFps?.get(x.video.id) ?? x.fp;
      const maxSim = recent.reduce((m, r) => Math.max(m, cosine(fp, r.fp)), 0);
      const value = lambda * scale(x.parts.total) - (1 - lambda) * maxSim;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    if (best < 0) best = 0;
    const [pick] = pool.splice(best, 1);
    out.push(pick.video);
    shown.push({ creatorId: pick.video.creatorId, fp: ctxFps?.get(pick.video.id) ?? pick.fp });
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
