import type { Mood, SwipeKind } from '@/ai/swipe';
import type { Video } from '@/types';

export interface FeedItem {
  /** Unique key: the same video can appear again later in an endless feed. */
  key: string;
  video: Video;
}

/** What happened on a swipe, for the Home page (and the For You algorithm). */
export interface SwipeInfo {
  /** How the clip you just left was watched: skip, glance, watched or rewatch. */
  kind?: SwipeKind;
  /** 'fresh' after a run of quick skips: the Home page then mixes in more variety. */
  mood: Mood;
  /** The clip you just left. */
  prevVideoId?: string;
}
