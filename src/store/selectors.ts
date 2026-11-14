import { rankFeed, type Signals } from '@/ai/recommender';
import type { AppState } from '@/store/AppStore';
import type { Video } from '@/types';

/** Videos anyone can see in the public feed (not hidden or reported by you). */
export function publicVideos(state: AppState): Video[] {
  return state.videos.filter((v) => v.visibility === 'public' && !state.hidden[v.id]);
}

export function signalsFrom(state: AppState): Signals {
  const commentCounts: Record<string, number> = {};
  const engaged: Record<string, true> = { ...state.shared };
  for (const c of state.comments) {
    commentCounts[c.videoId] = (commentCounts[c.videoId] ?? 0) + 1;
    if (c.userId === state.me?.id) engaged[c.videoId] = true;
  }
  return {
    liked: state.liked,
    saved: state.saved,
    following: state.following,
    notInterested: state.notInterested,
    engaged,
    watch: state.watch,
    commentCounts,
  };
}

/** "For You": ordered by the feed algorithm (src/ai/recommender.ts). */
export function forYouFeed(state: AppState, seed: string, context?: Video[], only?: Set<string>): Video[] {
  const pool = only ? publicVideos(state).filter((v) => only.has(v.id)) : publicVideos(state);
  return rankFeed(pool, signalsFrom(state), { now: Date.now(), meId: state.me?.id, seed, context });
}

/** "Following": newest videos from people you follow. */
export function followingFeed(state: AppState): Video[] {
  return publicVideos(state)
    .filter((v) => state.following[v.creatorId] && !state.notInterested[v.id])
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function trending(state: AppState): Video[] {
  return [...publicVideos(state)].sort((a, b) => b.likes + b.shares * 3 - (a.likes + a.shares * 3));
}

export function videosByUser(state: AppState, userId: string): Video[] {
  const mine = userId === state.me?.id;
  return state.videos.filter((v) => v.creatorId === userId && (mine || (v.visibility === 'public' && !state.hidden[v.id])));
}

/** Resolves the list a grid tile was opened from, so you can keep swiping through it. */
export function listByKey(state: AppState, key: string | undefined): Video[] {
  if (!key) return publicVideos(state);
  if (key === 'trending') return trending(state);
  if (key === 'saved') return state.videos.filter((v) => state.saved[v.id]);
  if (key === 'liked') return state.videos.filter((v) => state.liked[v.id]);
  if (key.startsWith('user:')) return videosByUser(state, key.slice(5));
  if (key.startsWith('search:')) return searchVideos(state, key.slice(7));
  return publicVideos(state);
}

export function searchVideos(state: AppState, query: string): Video[] {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return trending(state);
  return trending(state).filter((v) => {
    const creator = state.users.find((u) => u.id === v.creatorId);
    return (
      v.title.toLowerCase().includes(q) ||
      v.prompt.toLowerCase().includes(q) ||
      v.tags.some((t) => t.includes(q)) ||
      creator?.username.toLowerCase().includes(q) ||
      creator?.displayName.toLowerCase().includes(q)
    );
  });
}
