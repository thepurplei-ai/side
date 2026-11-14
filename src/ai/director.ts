// The AI Director: turns plain-English instructions into a scene plan and edits it.
//
// This version runs on the phone with simple language rules, so it works offline and costs
// nothing. Later it can be swapped for a cloud language model that returns the same
// { scenes, style, notes, reply } shape, without changing any screen.
//
// Pure TypeScript, no app imports: tested by `npm test`.

import type { Scene } from '../types';

export const STYLES = [
  'Cinematic',
  'Anime',
  'Animated 3D',
  'Comic book',
  'Fantasy',
  'Sci-fi',
  'Vintage film',
  'Noir',
  'Claymation',
  'Watercolor',
] as const;

export const MAX_SCENES = 8;
export const DEFAULT_SCENE_SEC = 5;
const MIN_SCENE_SEC = 2;
const MAX_SCENE_SEC = 15;

export interface DirectorPlan {
  scenes: Scene[];
  style: string;
  notes: string[];
}

export interface DirectorResult extends DirectorPlan {
  reply: string;
  changed: boolean;
}

let counter = 0;
export function newSceneId(): string {
  counter += 1;
  return `sc_${Date.now().toString(36)}_${counter}`;
}

function scene(description: string, durationSec = DEFAULT_SCENE_SEC): Scene {
  return { id: newSceneId(), description: tidy(description), durationSec };
}

function tidy(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ').replace(/^[,;:\-–—\s]+|[,;:\s]+$/g, '');
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Finds a style name mentioned in the text, e.g. "make it anime" → "Anime". */
export function detectStyle(text: string): string | undefined {
  const t = text.toLowerCase();
  const aliases: [RegExp, string][] = [
    [/\banime\b|\bmanga\b/, 'Anime'],
    [/\b(pixar|3d animat|animated 3d|cartoon)\b/, 'Animated 3D'],
    [/\bcomic\b/, 'Comic book'],
    [/\bfantasy\b|\bmagical\b/, 'Fantasy'],
    [/\bsci[- ]?fi\b|\bscience fiction\b|\bfuturistic\b/, 'Sci-fi'],
    [/\bvintage\b|\bretro\b|\bold film\b/, 'Vintage film'],
    [/\bnoir\b|\bblack and white\b/, 'Noir'],
    [/\bclay\b|\bclaymation\b|\bstop[- ]motion\b/, 'Claymation'],
    [/\bwatercolou?r\b|\bpainted\b/, 'Watercolor'],
    [/\bcinematic\b|\brealistic\b|\bmovie\b/, 'Cinematic'],
  ];
  for (const [re, style] of aliases) if (re.test(t)) return style;
  return undefined;
}

/** Splits a story idea into scenes: one per sentence or "then …" step. */
export function splitIntoBeats(prompt: string): string[] {
  return prompt
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+|\s*,?\s*\b(?:and then|after that|then|finally)\b\s*/i)
    .map((s) => (s ?? '').trim())
    .filter((s) => s.replace(/[.!?,\s]/g, '').length > 2);
}

/**
 * Makes the first scene plan for a new video.
 * A one-sentence idea becomes a short three-part clip (opening, action, finale).
 */
export function planFromPrompt(prompt: string, style?: string): DirectorPlan {
  const beats = splitIntoBeats(prompt).slice(0, MAX_SCENES);
  const chosenStyle = style ?? detectStyle(prompt) ?? 'Cinematic';
  if (beats.length === 0) {
    return { scenes: [], style: chosenStyle, notes: [] };
  }
  if (beats.length === 1) {
    const idea = beats[0].replace(/[.!?]+$/, '');
    // Keep "I" capitalised: "setting the scene for I am a hero" reads better as "…for: I am a hero".
    const lower = /^I\b/.test(idea) ? idea : idea.charAt(0).toLowerCase() + idea.slice(1);
    return {
      style: chosenStyle,
      notes: [],
      scenes: [
        scene(`Opening shot: setting the scene for ${lower}`, 4),
        scene(idea, 6),
        scene(`Finale: a big, memorable ending to ${lower}`, 4),
      ],
    };
  }
  return { style: chosenStyle, notes: [], scenes: beats.map((b) => scene(b.replace(/[.!?]+$/, ''))) };
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, fourth: 4,
  five: 5, fifth: 5, six: 6, sixth: 6, seven: 7, seventh: 7, eight: 8, eighth: 8,
};

/** Reads "scene 2", "the second scene", "last scene" → a 0-based index, or undefined. */
function sceneIndex(text: string, count: number): number | undefined {
  const t = text.toLowerCase();
  if (/\b(last|final) scene\b/.test(t)) return count > 0 ? count - 1 : undefined;
  if (/\bfirst scene\b|\bopening( scene| shot)?\b/.test(t)) return count > 0 ? 0 : undefined;
  const num = t.match(/\bscene\s*#?\s*(\d+)\b/);
  if (num) return Number(num[1]) - 1;
  const word = t.match(/\b(?:scene\s+(one|two|three|four|five|six|seven|eight)|(first|second|third|fourth|fifth|sixth|seventh|eighth|last)\s+scene)\b/);
  if (word) {
    const w = word[1] ?? word[2];
    return NUMBER_WORDS[w] - 1;
  }
  return undefined;
}

function clampDuration(sec: number): number {
  return Math.max(MIN_SCENE_SEC, Math.min(MAX_SCENE_SEC, Math.round(sec)));
}

export function totalDuration(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationSec, 0);
}

/**
 * Applies one plain-English instruction to the plan.
 * Examples: "add a scene where I fly over the city", "remove scene 2",
 * "change scene 1 to a snowy forest", "swap scene 1 and 3", "make it anime",
 * "make it longer", "make scene 2 shorter", "start over: a pirate adventure".
 */
export function applyInstruction(plan: DirectorPlan, instruction: string): DirectorResult {
  const text = instruction.trim();
  const t = text.toLowerCase();
  const scenes = plan.scenes.map((s) => ({ ...s }));
  const n = scenes.length;
  const result = (reply: string, next: Partial<DirectorPlan> = {}, changed = true): DirectorResult => ({
    scenes: next.scenes ?? scenes,
    style: next.style ?? plan.style,
    notes: next.notes ?? plan.notes,
    reply,
    changed,
  });
  const badIndex = (i: number | undefined) => i === undefined || i < 0 || i >= n;

  if (!text) return result('Tell me what to change, for example "add a scene where I fly over the city".', {}, false);

  // Start over with a new story.
  const restart = text.match(/^(?:start over|new story|restart)\s*[:,-]?\s*(.*)$/i);
  if (restart) {
    const fresh = planFromPrompt(restart[1] || '', detectStyle(restart[1] || '') ?? plan.style);
    if (fresh.scenes.length === 0) return result('What should the new story be about?', {}, false);
    return result(`Fresh start! I planned ${fresh.scenes.length} new scenes.`, fresh);
  }

  // Remove / delete a scene.
  if (/\b(remove|delete|cut|drop)\b/.test(t) && /\bscene\b/.test(t)) {
    const i = sceneIndex(t, n);
    if (badIndex(i)) return result(`Which scene? There ${n === 1 ? 'is 1 scene' : `are ${n} scenes`}.`, {}, false);
    if (n === 1) return result('A video needs at least one scene, so I kept it.', {}, false);
    scenes.splice(i!, 1);
    return result(`Done. I removed scene ${i! + 1}. ${scenes.length} scenes left.`);
  }

  // Swap two scenes.
  const swap = t.match(/\bswap\s+scenes?\s*(\d+)\s*(?:and|with|&)\s*(?:scene\s*)?(\d+)/);
  if (swap) {
    const a = Number(swap[1]) - 1;
    const b = Number(swap[2]) - 1;
    if (badIndex(a) || badIndex(b)) return result(`I only have ${n} scenes.`, {}, false);
    [scenes[a], scenes[b]] = [scenes[b], scenes[a]];
    return result(`Swapped scenes ${a + 1} and ${b + 1}.`);
  }

  // Move a scene to the start / end.
  const move = t.match(/\bmove\s+scene\s*(\d+)\s+to\s+the\s+(start|beginning|end)/);
  if (move) {
    const i = Number(move[1]) - 1;
    if (badIndex(i)) return result(`I only have ${n} scenes.`, {}, false);
    const [s] = scenes.splice(i, 1);
    if (move[2] === 'end') scenes.push(s);
    else scenes.unshift(s);
    return result(`Moved scene ${i + 1} to the ${move[2]}.`);
  }

  // Add a scene.
  const add = text.match(/^(?:please\s+)?(?:add|insert|include)\s+(?:a\s+|an\s+|one\s+more\s+|another\s+)?(?:new\s+)?(?:scene|shot|part|ending)\s*(?:where|in which|with|of|:|that shows|showing)?\s*(.*)$/i);
  if (add) {
    if (n >= MAX_SCENES) return result(`That's the maximum of ${MAX_SCENES} scenes. Remove one first.`, {}, false);
    const what = add[1].replace(/\s*(at the (start|beginning|end))\s*$/i, '');
    if (!what.trim()) return result('What should happen in the new scene?', {}, false);
    const s = scene(what);
    if (/at the (start|beginning)\s*$/i.test(add[1])) scenes.unshift(s);
    else scenes.push(s);
    return result(`Added scene: "${s.description}".`);
  }

  // Longer / shorter (one scene or the whole video).
  const longer = /\b(longer|slower|extend)\b/.test(t);
  const shorter = /\b(shorter|faster|quicker|trim)\b/.test(t);
  if (longer || shorter) {
    const i = sceneIndex(t, n);
    const factor = longer ? 1.5 : 0.67;
    if (i !== undefined) {
      if (badIndex(i)) return result(`I only have ${n} scenes.`, {}, false);
      scenes[i].durationSec = clampDuration(scenes[i].durationSec * factor);
      return result(`Scene ${i + 1} is now ${scenes[i].durationSec} seconds.`);
    }
    for (const s of scenes) s.durationSec = clampDuration(s.durationSec * factor);
    return result(`The video is now about ${totalDuration(scenes)} seconds long.`);
  }

  // Change one scene: "change scene 2 to …", "make scene 2 …", "scene 2: …".
  const i = sceneIndex(t, n);
  if (i !== undefined) {
    if (badIndex(i)) return result(`I only have ${n} scenes.`, {}, false);
    const m =
      text.match(/scene\s*#?\s*(?:\d+|one|two|three|four|five|six|seven|eight)\b\s*(?:to|into|:|-|should be|should show|is)?\s*(.*)$/i) ??
      text.match(/(?:first|second|third|fourth|fifth|sixth|seventh|eighth|last|final)\s+scene\b\s*(?:to|into|:|-|should be|should show|is)?\s*(.*)$/i);
    const what = (m?.[1] ?? '').trim();
    if (!what) return result(`What should scene ${i + 1} show?`, {}, false);
    const isRewrite = /^(change|replace|rewrite|scene)/i.test(text) || /\bscene\b[^.]*?\b(to|into)\b|\bscene\s*#?\s*\w+\s*:/i.test(text);
    scenes[i].description = isRewrite ? tidy(what) : tidy(`${scenes[i].description}, ${what}`);
    return result(`Updated scene ${i + 1}: "${scenes[i].description}".`);
  }

  // Change the visual style.
  const style = detectStyle(t);
  if (style && /\b(make|turn|style|look|use|in|switch|change)\b/.test(t)) {
    if (style === plan.style) return result(`It's already in ${style} style.`, {}, false);
    return result(`Switched the look to ${style}.`, { style });
  }

  // Anything else becomes a note for every scene ("make it night time", "add snow").
  const note = tidy(text.replace(/^(please\s+)?(make it|make everything|i want it to be|i want)\s*/i, ''));
  if (plan.notes.some((x) => x.toLowerCase() === note.toLowerCase())) {
    return result('I already have that note.', {}, false);
  }
  return result(`Got it. I'll apply "${note}" to every scene.`, { notes: [...plan.notes, note] });
}

/** The full text prompt sent to the video model for one scene. */
export function scenePrompt(plan: DirectorPlan, index: number, hasCast: boolean): string {
  const s = plan.scenes[index];
  const parts = [
    s.description,
    `${plan.style} style`,
    ...plan.notes,
    hasCast ? 'the main character is the person in the reference photo' : '',
  ];
  return parts.filter(Boolean).join('. ');
}
