// The shapes of the data Side works with.

/** Built-in demo clips (see src/data/clips.ts). */
export type ClipKey = 'hero' | 'mars' | 'christmas' | 'fantasy' | 'ocean' | 'city' | 'aurora' | 'desert' | 'neon' | 'forest';

/** Where a video's picture comes from: a built-in clip or a file on the phone / in the cloud. */
export interface MediaSource {
  clip?: ClipKey;
  /** A photo or video saved on the phone (in side's own folder). */
  uri?: string;
  /** For files from the phone: is it a photo or a video? (Built-in clips are always videos.) */
  type?: 'image' | 'video';
  /** Cover picture for a video from the phone. */
  posterUri?: string;
  /** Wide videos are shown whole (with soft edges) instead of cropped. */
  orientation?: 'portrait' | 'landscape' | 'square';
  durationSec?: number;
}

/** A photo or video that has been checked and saved, ready to post or to use with AI. */
export interface ImportedMedia {
  uri: string;
  type: 'image' | 'video';
  posterUri?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  orientation: 'portrait' | 'landscape' | 'square';
}

export type Visibility = 'public' | 'followers' | 'private';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  followers: number;
}

export interface Video {
  id: string;
  creatorId: string;
  title: string;
  prompt: string;
  source: MediaSource;
  /** The person's own photo shown as the "star" of the video, if any. */
  castUri?: string;
  likes: number;
  shares: number;
  /** The creator lets other people make their own version. */
  remixAllowed: boolean;
  remixOfId?: string;
  tags: string[];
  visibility: Visibility;
  createdAt: number;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface Scene {
  id: string;
  description: string;
  durationSec: number;
}

export type ProjectStatus = 'draft' | 'generating' | 'ready' | 'failed';

export interface Project {
  id: string;
  title: string;
  prompt: string;
  style: string;
  /** Extra notes from the AI Director that apply to every scene. */
  notes: string[];
  scenes: Scene[];
  media?: { uri: string; type: 'image' | 'video' };
  /** The person confirmed the photo/video is them, or that they have permission. */
  consentConfirmed: boolean;
  remixOfId?: string;
  templateId?: string;
  /** Family Mode: the child this story is for ('family' = the whole family). Always private. */
  familyChildId?: string;
  status: ProjectStatus;
  progress: number;
  result?: MediaSource;
  error?: string;
  publishedVideoId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  title: string;
  prompt: string;
  style: string;
  clip: ClipKey;
  familyFriendly: boolean;
}

export interface ChildProfile {
  id: string;
  name: string;
  avatarColor: string;
}

export interface FamilySettings {
  enabled: boolean;
  /** Hash of the parent's 4-digit PIN. Needed to leave Family Mode. */
  pinHash?: string;
  children: ChildProfile[];
}

export interface Report {
  id: string;
  targetType: 'video' | 'comment';
  targetId: string;
  reason: string;
  createdAt: number;
}

export interface DirectorMessage {
  id: string;
  from: 'user' | 'director';
  text: string;
}
