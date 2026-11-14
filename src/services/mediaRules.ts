// Rules for photos and videos people add to side. Pure TypeScript: tested by `npm test`.

export const MAX_VIDEO_SEC = 60;
export const MIN_VIDEO_SEC = 1;
export const MAX_FILE_MB = 300;

export interface MediaInfo {
  type: 'image' | 'video';
  /** Seconds (videos only). Pickers often report milliseconds; pass what you have, see normalizeDuration. */
  durationSec?: number;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
}

/** Image pickers give video length in milliseconds, cameras sometimes in seconds. */
export function normalizeDuration(raw: number | null | undefined): number | undefined {
  if (raw == null || !isFinite(raw) || raw <= 0) return undefined;
  return raw > 1000 ? raw / 1000 : raw;
}

/** Returns a friendly problem, or undefined if the photo/video is fine. */
export function checkMedia(m: MediaInfo): string | undefined {
  if (m.fileSizeBytes && m.fileSizeBytes > MAX_FILE_MB * 1024 * 1024) {
    return `That file is too big (over ${MAX_FILE_MB} MB). Try a shorter video.`;
  }
  if (m.type === 'video' && m.durationSec !== undefined) {
    if (m.durationSec > MAX_VIDEO_SEC + 0.5) return `Clips can be up to ${MAX_VIDEO_SEC} seconds. This one is ${Math.round(m.durationSec)} seconds.`;
    if (m.durationSec < MIN_VIDEO_SEC) return 'That video is too short. Record at least 1 second.';
  }
  if (m.width && m.height && (m.width < 200 || m.height < 200)) return 'That picture is too small. Try a sharper one.';
  return undefined;
}

/** "landscape", "portrait" or "square": used to pick how the clip fills the screen. */
export function orientation(m: MediaInfo): 'portrait' | 'landscape' | 'square' {
  if (!m.width || !m.height) return 'portrait';
  const r = m.width / m.height;
  if (r > 1.1) return 'landscape';
  if (r < 0.9) return 'portrait';
  return 'square';
}

const STOP = new Set('the and for with from this that you your our are was were have has had just into over under then when what this my me i a an of to in on at it is be'.split(' '));

/**
 * Tags for a clip: every #hashtag in the caption, plus the most meaningful words.
 * Tags feed the For You algorithm, search and "known for".
 */
export function tagsFromCaption(caption: string, limit = 5): string[] {
  const hashtags = [...caption.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)].map((m) => m[1].toLowerCase());
  const words = caption
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const out: string[] = [];
  for (const t of [...hashtags, ...words]) if (!out.includes(t)) out.push(t);
  return out.slice(0, limit);
}

/** The caption without hashtags, for the title. */
export function titleFromCaption(caption: string): string {
  return caption.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
