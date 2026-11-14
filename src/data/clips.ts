import type { VideoSource } from 'expo-video';

import type { ClipKey, MediaSource } from '@/types';

// Built-in demo clips, made by scripts/make-sample-videos.sh.
const CLIPS: Record<ClipKey, number> = {
  hero: require('../../assets/videos/hero.mp4'),
  mars: require('../../assets/videos/mars.mp4'),
  christmas: require('../../assets/videos/christmas.mp4'),
  fantasy: require('../../assets/videos/fantasy.mp4'),
  ocean: require('../../assets/videos/ocean.mp4'),
  city: require('../../assets/videos/city.mp4'),
};

// Cover pictures for each clip (a frame from the video), shown while it loads and in grids.
const POSTERS: Record<ClipKey, number> = {
  hero: require('../../assets/posters/hero.jpg'),
  mars: require('../../assets/posters/mars.jpg'),
  christmas: require('../../assets/posters/christmas.jpg'),
  fantasy: require('../../assets/posters/fantasy.jpg'),
  ocean: require('../../assets/posters/ocean.jpg'),
  city: require('../../assets/posters/city.jpg'),
};

/** The cover picture for a video, or undefined for a video from the phone. */
export function posterFor(source: MediaSource | undefined): number | undefined {
  if (!source || source.uri) return undefined;
  return POSTERS[source.clip ?? 'fantasy'];
}

export function posterForClip(clip: ClipKey): number {
  return POSTERS[clip];
}

export function toVideoSource(source: MediaSource): VideoSource {
  if (source.uri) return { uri: source.uri };
  return CLIPS[source.clip ?? 'fantasy'];
}

/** Picks the demo clip that best matches a story idea. */
export function clipForPrompt(text: string): ClipKey {
  const t = text.toLowerCase();
  if (/mars|space|astronaut|planet|rocket|moon|galaxy/.test(t)) return 'mars';
  if (/christmas|santa|snow|winter|elf|reindeer|north pole/.test(t)) return 'christmas';
  if (/hero|superhero|save|rescue|fly|power/.test(t)) return 'hero';
  if (/ocean|sea|beach|pirate|mermaid|underwater|island|whale/.test(t)) return 'ocean';
  if (/city|new york|street|robot|cyber|neon|future/.test(t)) return 'city';
  return 'fantasy';
}
