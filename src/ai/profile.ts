// The profile algorithm: what a profile page shows and in which order.
//
//  - Clip order, three ways:
//      Top           best clips first: engagement (likes, comments, shares, remixes) with a gentle
//                    age discount, so a strong new clip can beat an old one with a few more likes,
//      Latest        newest first,
//      Most remixed  clips that most people made their own version of.
//    Pinned clips (up to 3) always come first.
//  - Insights: totals, engagement per clip, and a creator level.
//  - "Known for": the topics a creator's best clips are about.
//  - Taste match: how close a creator's clips are to what you like (0–100%).
//  - "People you may like" / "Similar creators": creators whose clips are closest to your taste
//    or to this creator's style.
//
// Pure TypeScript, built on the same fingerprints as the For You feed. Tested by `npm test`.

import type { Comment, User, Video } from '../types';

import { buildTaste, cosine, fingerprints, type Signals, type Vec } from './recommender.ts';

const HOUR = 3600_000;
export const MAX_PINS = 3;

export type ProfileSort = 'top' | 'latest' | 'remixed';

export interface ClipStats {
  likes: number;
  comments: number;
  shares: number;
  remixes: number;
  engagement: number;
}

/** Remix counts for every video (how many published clips are "their version" of it). */
export function remixCounts(allVideos: Video[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of allVideos) if (v.remixOfId) out[v.remixOfId] = (out[v.remixOfId] ?? 0) + 1;
  return out;
}

export function clipStats(v: Video, commentCount: number, remixes: number): ClipStats {
  return {
    likes: v.likes,
    comments: commentCount,
    shares: v.shares,
    remixes,
    // Deeper actions count more: a remix means someone made a whole clip from yours.
    engagement: v.likes + 2 * commentCount + 3 * v.shares + 5 * remixes,
  };
}

/** Top score: engagement on a log scale, discounted a little by age (half after ~2 weeks). */
export function topScore(stats: ClipStats, createdAt: number, now: number): number {
  const ageH = Math.max(0, (now - createdAt) / HOUR);
  return Math.log10(1 + stats.engagement) * Math.pow(0.5, ageH / (24 * 14));
}

export function sortProfileClips(
  videos: Video[],
  sort: ProfileSort,
  ctx: { now: number; commentCounts: Record<string, number>; remixes: Record<string, number>; pinned?: Record<string, true> },
): Video[] {
  const stat = (v: Video) => clipStats(v, ctx.commentCounts[v.id] ?? 0, ctx.remixes[v.id] ?? 0);
  const key = (v: Video): number => {
    if (sort === 'latest') return v.createdAt;
    if (sort === 'remixed') return (ctx.remixes[v.id] ?? 0) * 1e6 + stat(v).engagement;
    return topScore(stat(v), v.createdAt, ctx.now);
  };
  const pinned = videos.filter((v) => ctx.pinned?.[v.id]).sort((a, b) => b.createdAt - a.createdAt);
  const rest = videos.filter((v) => !ctx.pinned?.[v.id]).sort((a, b) => key(b) - key(a));
  return [...pinned, ...rest];
}

export type CreatorLevel = 'New' | 'Rising' | 'Popular' | 'Star';

export interface Insights {
  clips: number;
  likes: number;
  comments: number;
  shares: number;
  remixes: number;
  /** Average engagement per clip. */
  perClip: number;
  level: CreatorLevel;
  /** 0..1 progress towards the next level. */
  levelProgress: number;
  bestClipId?: string;
}

const LEVELS: [CreatorLevel, number][] = [
  ['New', 0],
  ['Rising', 2], // log10 of (engagement + followers): ~100
  ['Popular', 3.5], // ~3,000
  ['Star', 4.5], // ~30,000
];

export function insights(user: User, videos: Video[], comments: Comment[], allVideos: Video[]): Insights {
  const counts: Record<string, number> = {};
  for (const c of comments) counts[c.videoId] = (counts[c.videoId] ?? 0) + 1;
  const remixes = remixCounts(allVideos);
  let likes = 0;
  let com = 0;
  let shares = 0;
  let rem = 0;
  let total = 0;
  let best: { id: string; e: number } | undefined;
  for (const v of videos) {
    const s = clipStats(v, counts[v.id] ?? 0, remixes[v.id] ?? 0);
    likes += s.likes;
    com += s.comments;
    shares += s.shares;
    rem += s.remixes;
    total += s.engagement;
    if (!best || s.engagement > best.e) best = { id: v.id, e: s.engagement };
  }
  const score = Math.log10(1 + total + user.followers);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (score >= LEVELS[i][1]) idx = i;
  const next = LEVELS[idx + 1];
  const levelProgress = next ? Math.max(0, Math.min(1, (score - LEVELS[idx][1]) / (next[1] - LEVELS[idx][1]))) : 1;
  return {
    clips: videos.length,
    likes,
    comments: com,
    shares,
    remixes: rem,
    perClip: videos.length ? Math.round(total / videos.length) : 0,
    level: LEVELS[idx][0],
    levelProgress,
    bestClipId: videos.length && best && best.e > 0 ? best.id : undefined,
  };
}

/** The topics a creator is known for: tags weighted by how well those clips did. */
export function knownFor(videos: Video[], limit = 3): string[] {
  const w: Record<string, number> = {};
  for (const v of videos) for (const t of v.tags) w[t] = (w[t] ?? 0) + 1 + Math.log10(1 + v.likes + 3 * v.shares);
  return Object.entries(w)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

/** One fingerprint per creator: the average of their clips' fingerprints. */
export function creatorVectors(allVideos: Video[]): Map<string, Vec> {
  const fps = fingerprints(allVideos);
  const out = new Map<string, Vec>();
  for (const v of allVideos) {
    const fp = fps.get(v.id);
    if (!fp) continue;
    const acc = out.get(v.creatorId) ?? new Map();
    for (const [k, x] of fp) {
      // Leave out the creator's own id so matching is about content, not the name.
      if (!k.startsWith('creator:')) acc.set(k, (acc.get(k) ?? 0) + x);
    }
    out.set(v.creatorId, acc);
  }
  return out;
}

/** How well a creator matches your taste, 0..100. Undefined when we don't know your taste yet. */
export function tasteMatch(creatorId: string, allVideos: Video[], s: Signals, now: number): number | undefined {
  const taste = buildTaste(allVideos, fingerprints(allVideos), s, now);
  if (taste.cold) return undefined;
  const vec = creatorVectors(allVideos).get(creatorId);
  if (!vec) return undefined;
  const content: Vec = new Map([...taste.vector].filter(([k]) => !k.startsWith('creator:')));
  return Math.round(Math.max(0, cosine(content, vec)) * 100);
}

/**
 * Creators to suggest.
 *  - With `like` (a creator id): creators most similar to that creator ("Similar creators").
 *  - Otherwise: creators closest to your taste ("People you may like"); popular ones if we
 *    don't know your taste yet.
 * People you already follow, and you yourself, are left out.
 */
export function suggestCreators(
  users: User[],
  allVideos: Video[],
  s: Signals,
  opts: { now: number; meId?: string; like?: string; limit?: number },
): User[] {
  const vecs = creatorVectors(allVideos);
  let target: Vec | undefined;
  if (opts.like) target = vecs.get(opts.like);
  else {
    const taste = buildTaste(allVideos, fingerprints(allVideos), s, opts.now);
    if (!taste.cold) target = new Map([...taste.vector].filter(([k]) => !k.startsWith('creator:')));
  }
  const pop = (u: User) => Math.log10(1 + u.followers) / 7; // ~0..1
  return users
    .filter((u) => u.id !== opts.meId && u.id !== opts.like && !s.following[u.id] && vecs.has(u.id))
    .map((u) => ({ u, score: (target ? cosine(target, vecs.get(u.id)!) : 0) + 0.25 * pop(u) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5)
    .map((x) => x.u);
}
