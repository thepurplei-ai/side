# Side — instructions for Claude Code

Side (working name "WonderReel") is an AI video creation + social app: a TikTok-style feed of AI videos,
an AI Director that plans and edits short multi-scene clips (Side makes clips, not movies), and "Create My Version" to star in someone
else's story with your own photo. Android first, iPhone from the same code.

The owner is learning to code and works from a phone. Explain steps in plain, simple English and keep
them short. Never ask the owner to run terminal commands: run them yourself.

## Project

- Expo (React Native) + TypeScript + Expo Router. Screens live in `src/app/` (every file is a route).
- Tabs: `src/app/(tabs)/` → Home (`index`), Discover, Create, Studio, Profile.
- `src/ai/director.ts`: the AI Director (pure TS, offline rules). Tested.
- `src/ai/recommender.ts`: the For You algorithm v2: TF-IDF fingerprints of each video, long-term +
  right-now taste vectors, Thompson-sampling bandit per topic, quality/freshness/follow, seen penalties,
  MMR mixing. Home re-ranks unseen videos after every swipe. Pure TS. Tested.
- `src/ai/profile.ts`: the profile algorithm: Top / Latest / Most remixed clip order with pins, creator
  insights and level, "known for" topics, taste match %, People you may like / Similar creators. Tested.
- Media pipeline: `src/services/media.ts` (check → copy into app folder → video cover picture) with rules in
  `src/services/mediaRules.ts` (tested). Camera (`src/app/camera.tsx`) shows Retake / Use it, then hands the
  media to Create via `state.draft` (not URL params). Create can "Post as it is" (your own clip) or
  "Transform with AI". Photo posts show with a slow zoom; wide videos are shown whole on a blurred copy.
- Plain "Your own idea" card (`src/components/OwnIdeaCard.tsx`) opens a blank Create (`fresh` param).
- Demo clips 720x1280 + cover pictures (`assets/posters`) made by `scripts/make-sample-videos.sh`.
- Look: "Deep Ocean" (`src/theme.ts`): deep sea-blue backdrop (`src/components/Backdrop.tsx`, add it to every new tab screen), aquamarine buttons, a warm coral `highlight` for small touches, off-white text, Fraunces serif titles + Manrope.
  Floating dock menu (`src/components/Dock.tsx`) with a violet camera shutter that opens `src/app/camera.tsx`.
  Videos show a "ticket" info panel and a coral progress line, not a side icon rail.
- Home: videos slide sideways (left = next), one per swipe. Phones use the native page swiper
  (`src/components/VideoFeed.tsx`, react-native-pager-view) with a black veil so nothing of the next clip
  shows; `VideoFeed.web.tsx` is a FlatList copy for browser tests only. Following / For You is a tap switch; tapping For You again refreshes.
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
