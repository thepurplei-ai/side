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
  aurora: require('../../assets/videos/aurora.mp4'),
  desert: require('../../assets/videos/desert.mp4'),
  neon: require('../../assets/videos/neon.mp4'),
  forest: require('../../assets/videos/forest.mp4'),
};

// Cover pictures for each clip (a frame from the video), shown while it loads and in grids.
const POSTERS: Record<ClipKey, number> = {
  hero: require('../../assets/posters/hero.jpg'),
  mars: require('../../assets/posters/mars.jpg'),
  christmas: require('../../assets/posters/christmas.jpg'),
  fantasy: require('../../assets/posters/fantasy.jpg'),
  ocean: require('../../assets/posters/ocean.jpg'),
  city: require('../../assets/posters/city.jpg'),
  aurora: require('../../assets/posters/aurora.jpg'),
  desert: require('../../assets/posters/desert.jpg'),
  neon: require('../../assets/posters/neon.jpg'),
  forest: require('../../assets/posters/forest.jpg'),
};

/** The cover picture for a clip: built-in poster, the photo itself, or a video's saved cover. */
export function posterFor(source: MediaSource | undefined): number | { uri: string } | undefined {
  if (!source) return undefined;
  if (source.uri) {
    if (source.type === 'image') return { uri: source.uri };
    return source.posterUri ? { uri: source.posterUri } : undefined;
  }
  return POSTERS[source.clip ?? 'fantasy'];
}

export function posterForClip(clip: ClipKey): number {
  return POSTERS[clip];
}

export function toVideoSource(source: MediaSource): VideoSource {
  if (source.type === 'image') return null; // photos are shown as pictures, not played
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
  if (/aurora|northern lights|arctic|ice|sky/.test(t)) return 'aurora';
  if (/desert|sand|camel|dune|sunset|egypt/.test(t)) return 'desert';
  if (/neon|cyber|hacker|code|matrix|dance|club/.test(t)) return 'neon';
  if (/forest|jungle|tree|wood|nature|garden|dinosaur/.test(t)) return 'forest';
  if (/city|new york|street|robot|future/.test(t)) return 'city';
  return 'fantasy';
}
