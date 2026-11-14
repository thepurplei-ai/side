// The app's memory: who you are, likes, follows, comments, projects and Family Mode.
// It is saved on the phone (AsyncStorage). When accounts and the cloud backend are added,
// these actions will also be sent to the server; the screens will not need to change.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

import { addView, type WatchStat } from '@/ai/recommender';
import { SEED_COMMENTS, SEED_USERS, SEED_VIDEOS } from '@/data/seed';
import type { ChildProfile, Comment, FamilySettings, ImportedMedia, Project, Report, User, Video } from '@/types';

/** A photo/video handed from the camera to the Create screen (not saved between app starts). */
export interface Draft {
  id: string;
  media: ImportedMedia;
  remixOf?: string;
  template?: string;
}

const STORAGE_KEY = 'side.state.v1';

export interface AppState {
  loaded: boolean;
  me: User | null;
  /** The person confirmed they are 18 or older. */
  adultConfirmed: boolean;
  users: User[];
  videos: Video[];
  comments: Comment[];
  liked: Record<string, true>;
  saved: Record<string, true>;
  following: Record<string, true>;
  hidden: Record<string, true>;
  /** Feed algorithm signals. */
  watch: Record<string, WatchStat>;
  notInterested: Record<string, true>;
  shared: Record<string, true>;
  /** Your clips pinned to the top of your profile (up to 3). */
  pinned: Record<string, true>;
  projects: Project[];
  draft?: Draft;
  family: FamilySettings;
  reports: Report[];
}

const initialState: AppState = {
  loaded: false,
  me: null,
  adultConfirmed: false,
  users: SEED_USERS,
  videos: SEED_VIDEOS,
  comments: SEED_COMMENTS,
  liked: {},
  saved: {},
  following: {},
  hidden: {},
  watch: {},
  notInterested: {},
  shared: {},
  pinned: {},
  projects: [],
  family: { enabled: false, children: [] },
  reports: [],
};

export type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'signUp'; user: User }
  | { type: 'updateProfile'; patch: Partial<Pick<User, 'displayName' | 'username' | 'bio'>> }
  | { type: 'toggleLike'; videoId: string }
  | { type: 'toggleSave'; videoId: string }
  | { type: 'toggleFollow'; userId: string }
  | { type: 'share'; videoId: string }
  | { type: 'recordView'; videoId: string; watchedMs: number; durationSec: number }
  | { type: 'notInterested'; videoId: string }
  | { type: 'togglePin'; videoId: string }
  | { type: 'setDraft'; draft: Draft | undefined }
  | { type: 'addComment'; comment: Comment }
  | { type: 'deleteComment'; commentId: string }
  | { type: 'report'; report: Report }
  | { type: 'upsertProject'; project: Project }
  | { type: 'deleteProject'; projectId: string }
  | { type: 'publish'; video: Video; projectId: string }
  | { type: 'unpublish'; videoId: string }
  | { type: 'setFamily'; family: FamilySettings }
  | { type: 'addChild'; child: ChildProfile }
  | { type: 'removeChild'; childId: string }
  | { type: 'reset' };

function toggle(map: Record<string, true>, key: string): Record<string, true> {
  const next = { ...map };
  if (next[key]) delete next[key];
  else next[key] = true;
  return next;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, loaded: true };
    case 'signUp':
      return { ...state, me: action.user, adultConfirmed: true, users: [...state.users.filter((u) => u.id !== action.user.id), action.user] };
    case 'updateProfile': {
      if (!state.me) return state;
      const me = { ...state.me, ...action.patch };
      return { ...state, me, users: state.users.map((u) => (u.id === me.id ? me : u)) };
    }
    case 'toggleLike': {
      const wasLiked = !!state.liked[action.videoId];
      return {
        ...state,
        liked: toggle(state.liked, action.videoId),
        videos: state.videos.map((v) => (v.id === action.videoId ? { ...v, likes: v.likes + (wasLiked ? -1 : 1) } : v)),
      };
    }
    case 'toggleSave':
      return { ...state, saved: toggle(state.saved, action.videoId) };
    case 'toggleFollow': {
      const was = !!state.following[action.userId];
      return {
        ...state,
        following: toggle(state.following, action.userId),
        users: state.users.map((u) => (u.id === action.userId ? { ...u, followers: u.followers + (was ? -1 : 1) } : u)),
      };
    }
    case 'recordView':
      return { ...state, watch: { ...state.watch, [action.videoId]: addView(state.watch[action.videoId], action.watchedMs, action.durationSec, Date.now()) } };
    case 'setDraft':
      return { ...state, draft: action.draft };
    case 'togglePin': {
      if (!state.pinned[action.videoId] && Object.keys(state.pinned).length >= 3) return state;
      return { ...state, pinned: toggle(state.pinned, action.videoId) };
    }
    case 'notInterested':
      return { ...state, notInterested: { ...state.notInterested, [action.videoId]: true } };
    case 'share':
      return { ...state, shared: { ...state.shared, [action.videoId]: true }, videos: state.videos.map((v) => (v.id === action.videoId ? { ...v, shares: v.shares + 1 } : v)) };
    case 'addComment':
      return { ...state, comments: [...state.comments, action.comment] };
    case 'deleteComment':
      return { ...state, comments: state.comments.filter((c) => c.id !== action.commentId) };
    case 'report':
      return {
        ...state,
        reports: [...state.reports, action.report],
        // Reported things are hidden for you straight away.
        hidden: { ...state.hidden, [action.report.targetId]: true },
      };
    case 'upsertProject': {
      const exists = state.projects.some((p) => p.id === action.project.id);
      return {
        ...state,
        projects: exists
          ? state.projects.map((p) => (p.id === action.project.id ? action.project : p))
          : [action.project, ...state.projects],
      };
    }
    case 'deleteProject':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.projectId) };
    case 'publish':
      return {
        ...state,
        videos: [action.video, ...state.videos.filter((v) => v.id !== action.video.id)],
        projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, publishedVideoId: action.video.id } : p)),
      };
    case 'unpublish':
      return {
        ...state,
        videos: state.videos.filter((v) => v.id !== action.videoId),
        projects: state.projects.map((p) => (p.publishedVideoId === action.videoId ? { ...p, publishedVideoId: undefined } : p)),
      };
    case 'setFamily':
      return { ...state, family: action.family };
    case 'addChild':
      return { ...state, family: { ...state.family, children: [...state.family.children, action.child] } };
    case 'removeChild':
      return { ...state, family: { ...state.family, children: state.family.children.filter((c) => c.id !== action.childId) } };
    case 'reset':
      return { ...initialState, loaded: true };
  }
}

/** Only the person's own data is saved; starter content always comes from the app. */
function toSaved(s: AppState) {
  const seedIds = new Set(SEED_VIDEOS.map((v) => v.id));
  const seedCommentIds = new Set(SEED_COMMENTS.map((c) => c.id));
  return {
    me: s.me,
    adultConfirmed: s.adultConfirmed,
    liked: s.liked,
    saved: s.saved,
    following: s.following,
    hidden: s.hidden,
    watch: s.watch,
    notInterested: s.notInterested,
    shared: s.shared,
    pinned: s.pinned,
    projects: s.projects,
    family: s.family,
    reports: s.reports,
    myVideos: s.videos.filter((v) => !seedIds.has(v.id)),
    myComments: s.comments.filter((c) => !seedCommentIds.has(c.id)),
    seedCounts: Object.fromEntries(s.videos.filter((v) => seedIds.has(v.id)).map((v) => [v.id, { likes: v.likes, shares: v.shares }])),
    followerCounts: Object.fromEntries(s.users.map((u) => [u.id, u.followers])),
  };
}

type Saved = ReturnType<typeof toSaved>;

function fromSaved(saved: Saved): Partial<AppState> {
  const projects = (saved.projects ?? []).map((p) =>
    // A video that was still being made when the app closed has to be started again.
    p.status === 'generating' ? { ...p, status: 'failed' as const, error: 'The app was closed while making this video. Tap Generate to try again.' } : p,
  );
  const videos = [
    ...(saved.myVideos ?? []),
    ...SEED_VIDEOS.map((v) => ({ ...v, ...(saved.seedCounts?.[v.id] ?? {}) })),
  ].sort((a, b) => b.createdAt - a.createdAt);
  const users = [...SEED_USERS, ...(saved.me ? [saved.me] : [])].map((u) => ({
    ...u,
    followers: saved.followerCounts?.[u.id] ?? u.followers,
  }));
  return {
    me: saved.me ?? null,
    adultConfirmed: !!saved.adultConfirmed,
    liked: saved.liked ?? {},
    saved: saved.saved ?? {},
    following: saved.following ?? {},
    hidden: saved.hidden ?? {},
    watch: saved.watch ?? {},
    notInterested: saved.notInterested ?? {},
    shared: saved.shared ?? {},
    pinned: saved.pinned ?? {},
    projects,
    family: saved.family ?? { enabled: false, children: [] },
    reports: saved.reports ?? [],
    comments: [...SEED_COMMENTS, ...(saved.myComments ?? [])],
    videos,
    users,
  };
}

const StoreContext = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? fromSaved(JSON.parse(raw)) : {} }))
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSaved(state))).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export function useUser(id: string | undefined): User | undefined {
  const { state } = useStore();
  return state.users.find((u) => u.id === id);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Simple hash for the Family Mode PIN, so the PIN itself is never stored. */
export function hashPin(pin: string): string {
  let h = 5381;
  const s = `side-family:${pin}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
