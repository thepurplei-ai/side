# Side — instructions for Claude Code

Side (working name "WonderReel") is an AI video creation + social app: a TikTok-style feed of AI videos,
an AI Director that plans and edits multi-scene movies, and "Create My Version" to star in someone
else's story with your own photo. Android first, iPhone from the same code.

The owner is learning to code and works from a phone. Explain steps in plain, simple English and keep
them short. Never ask the owner to run terminal commands: run them yourself.

## Project

- Expo (React Native) + TypeScript + Expo Router. Screens live in `src/app/` (every file is a route).
- Tabs: `src/app/(tabs)/` → Home (`index`), Discover, Create, Studio, Profile.
- `src/ai/director.ts`: the AI Director (pure TS, offline rules). Tested.
- `src/ai/recommender.ts`: the For You algorithm (watch time, likes, saves, follows, skips,
  "Not interested", freshness, diversity, exploration). Pure TS. Tested.
- Look: "Midnight Cinema" (`src/theme.ts`): night-blue, gold, cream, Fraunces serif titles + Manrope.
  Floating dock menu (`src/components/Dock.tsx`) with a camera shutter that opens `src/app/camera.tsx`.
  Videos show a "ticket" info panel and a gold progress line, not a side icon rail.
- Home is a sideways pager (Following ⇄ For You); each page is a vertical feed (`src/components/VideoFeed.tsx`).
- `src/ai/generator.ts`: `VideoGenerator` interface. `PreviewGenerator` returns sample clips until a real
  AI video service is connected. Screens only use the interface.
- `src/services/moderation.ts`: on-phone safety checks (pure TS). Tested.
- `src/store/AppStore.tsx`: app state (useReducer) saved to AsyncStorage.
- `src/data/seed.ts`: starter creators, videos, templates. Clips in `assets/videos` (made by `scripts/make-sample-videos.sh`).
- Bundle ID / package: `com.thepurpleiai.side`. Expo owner: `thepurplei_ai`.
- See `AGENTS.md` for Expo rules (always `npx expo install`, never edit `android/` or `ios/`).

## Checks (run all before every build)

```bash
npm test            # Node test runner, must show "fail 0"
npm run typecheck
npm run lint
npx expo-doctor
```

## Building

The owner has no computer, so build a standalone APK in the cloud:
`npm run build:android:preview`, then `npx eas-cli@latest build:list --limit 1` and give the owner the
build page link to open on their Android phone. `EXPO_TOKEN` must be set in the environment.

## Rules

- Safety first: every prompt, scene, title and comment goes through `checkText` / `checkComment`.
  Family Mode is always private: no feed, no comments, no publishing; leaving it needs the parent PIN.
- Users must be 18+. Children never get their own account.
- A face can only be used with consent (checkbox on Create). Remixes need the creator's permission
  (`remixAllowed`) and never copy the original creator's face.
- Keep text in plain English. Keep screens simple.
- Next steps are in `docs/ROADMAP.md`.
