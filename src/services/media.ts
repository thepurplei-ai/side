// The media pipeline: every photo or video from the camera or the gallery goes through here.
//
//   1. Check it (length, size, sharpness) with the rules in mediaRules.ts.
//   2. Copy it into side's own folder on the phone. Gallery links (content://…) can stop working
//      after the app closes; a copy always works.
//   3. For videos, make a cover picture from a frame near the start.
//
// Returns an ImportedMedia, or throws an Error with a friendly message.

import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

import { checkMedia, normalizeDuration, orientation } from '@/services/mediaRules';
import type { ImportedMedia } from '@/types';

export interface RawMedia {
  uri: string;
  type: 'image' | 'video';
  /** Seconds or milliseconds (both are handled). */
  duration?: number | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
  mimeType?: string | null;
}

function extensionFor(m: RawMedia): string {
  const fromName = m.uri.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  if (m.mimeType?.includes('/')) return m.mimeType.split('/')[1].replace('quicktime', 'mov').replace('jpeg', 'jpg');
  return m.type === 'video' ? 'mp4' : 'jpg';
}

function mediaFolder(): Directory {
  const dir = new Directory(Paths.document, 'media');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function importMedia(raw: RawMedia): Promise<ImportedMedia> {
  const durationSec = raw.type === 'video' ? normalizeDuration(raw.duration) : undefined;
  const info = { type: raw.type, durationSec, fileSizeBytes: raw.fileSize ?? undefined, width: raw.width, height: raw.height };
  const problem = checkMedia(info);
  if (problem) throw new Error(problem);

  let uri = raw.uri;
  if (Platform.OS !== 'web') {
    try {
      const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${extensionFor(raw)}`;
      const dest = new File(mediaFolder(), name);
      await new File(raw.uri).copy(dest);
      uri = dest.uri;
    } catch {
      // If copying fails we still use the original file; it works until the phone cleans it up.
      uri = raw.uri;
    }
  }

  let posterUri: string | undefined;
  if (raw.type === 'video' && Platform.OS !== 'web') {
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time: 500, quality: 0.7 });
      posterUri = thumb.uri;
    } catch {
      posterUri = undefined;
    }
  }

  return { uri, type: raw.type, posterUri, durationSec, width: raw.width, height: raw.height, orientation: orientation(info) };
}
