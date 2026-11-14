// The swipe engine: the rules behind the sideways feed.
//
// It watches how you swipe (not what the clips are about; that's recommender.ts) and decides:
//
//  1. Preloading: which clips to load in advance. Normally the next and previous clip. If you
//     swipe fast, it loads further ahead so the next clips are always ready. If you often swipe
//     back, it keeps more clips behind you loaded too.
//  2. What a swipe means: "skip" (gone in under ~1.5 s), "glance", "watched" (most or all of it),
//     "rewatch" (you swiped back to a clip you'd already seen: a strong sign you liked it).
//  3. Mood: a run of quick skips means you're not into what's coming. The feed then switches
//     to "fresh" mode: the next clips are re-ranked with more variety and more new topics.
//  4. Resume: if you swipe back to a clip you left half-way a moment ago, it continues where
//     you were instead of starting over.
//
// Pure TypeScript: tested by `npm test`.

export type SwipeKind = 'skip' | 'glance' | 'watched' | 'rewatch';
export type Mood = 'normal' | 'fresh';

export interface Visit {
  index: number;
  videoId: string;
  enteredAt: number;
  leftAt?: number;
  /** Seconds into the clip when you left. */
  leftAtTime?: number;
  durationSec: number;
  /** Came here by swiping back (right). */
  back: boolean;
}

export const SKIP_MS = 1500;
const FAST_DWELL_MS = 2500;
const BORED_STREAK = 3;
const RESUME_WITHIN_MS = 3 * 60_000;

export class SwipeSession {
  visits: Visit[] = [];

  /** Call when a clip lands on screen. Returns how the previous clip should be counted. */
  enter(index: number, videoId: string, durationSec: number, now: number, leftAtTime?: number): SwipeKind | undefined {
    const prev = this.visits[this.visits.length - 1];
    let kind: SwipeKind | undefined;
    if (prev && prev.leftAt === undefined) {
      prev.leftAt = now;
      prev.leftAtTime = leftAtTime;
      kind = classify(prev);
    }
    const back = !!prev && index < prev.index;
    this.visits.push({ index, videoId, enteredAt: now, durationSec, back });
    return kind;
  }

  /** The finished visits (every clip you've already swiped away from). */
  get done(): Visit[] {
    return this.visits.filter((v) => v.leftAt !== undefined);
  }

  /** Average time on a clip over the last few swipes, in ms. */
  averageDwell(last = 6): number | undefined {
    const d = this.done.slice(-last);
    if (d.length === 0) return undefined;
    return d.reduce((s, v) => s + (v.leftAt! - v.enteredAt), 0) / d.length;
  }

  /** Share of recent swipes that went back (right). */
  backRate(last = 10): number {
    const v = this.visits.slice(-last);
    if (v.length < 2) return 0;
    return v.filter((x) => x.back).length / (v.length - 1);
  }

  /** Quick skips in a row, counting back from the latest swipe. */
  skipStreak(): number {
    let n = 0;
    for (const v of [...this.done].reverse()) {
      if (classify(v) === 'skip') n++;
      else break;
    }
    return n;
  }

  mood(): Mood {
    return this.skipStreak() >= BORED_STREAK ? 'fresh' : 'normal';
  }

  /** Where to continue a clip you're coming back to, or 0 to start over. */
  resumeTime(videoId: string, now: number): number {
    const last = [...this.done].reverse().find((v) => v.videoId === videoId);
    if (!last || last.leftAtTime === undefined) return 0;
    if (now - last.leftAt! > RESUME_WITHIN_MS) return 0;
    // Nearly finished, or barely started: start over.
    if (last.leftAtTime < 1 || last.leftAtTime > last.durationSec - 1) return 0;
    return last.leftAtTime;
  }

  /** Which pages to load around the current one. */
  preloadRange(active: number, count: number): { from: number; to: number } {
    const dwell = this.averageDwell();
    const ahead = dwell !== undefined && dwell < FAST_DWELL_MS ? 3 : 1;
    const behind = this.backRate() > 0.25 ? 2 : 1;
    return { from: Math.max(0, active - behind), to: Math.min(count - 1, active + ahead) };
  }
}

/** What leaving a clip means. */
export function classify(v: Visit): SwipeKind {
  const dwell = (v.leftAt ?? v.enteredAt) - v.enteredAt;
  if (v.back && dwell >= SKIP_MS) return 'rewatch';
  const watchedSec = v.leftAtTime ?? dwell / 1000;
  const share = v.durationSec > 0 ? watchedSec / v.durationSec : 0;
  if (dwell < SKIP_MS && share < 0.25) return 'skip';
  if (share >= 0.8 || dwell >= v.durationSec * 1000 * 0.8) return 'watched';
  return 'glance';
}
