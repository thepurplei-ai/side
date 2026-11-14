# Side — roadmap

## Done (version 1, preview)

- Five tabs: Home feed, Discover, Create, Studio, Profile.
- TikTok-style vertical feed: like, comment, follow, save, share, report.
- "Create My Version" on videos whose creators allow it, with credit to the original.
- Create: photo, video or upload from the phone, consent check, idea, style.
- AI Director: plans scenes from an idea and edits them from plain-English instructions
  (add/remove/swap/move scenes, change style, longer/shorter, notes for every scene).
- Studio: projects, scene editing, make video, publish (everyone / followers / only me, allow remixes).
- Family Mode: PIN-protected, private, gentle stories, child profiles under the parent.
- 18+ sign-up, on-phone moderation, reports.
- Version 2: swipe sideways between Following and For You; smoother one-video-per-swipe
  scrolling with the next video preloaded; double-tap to like; "Not interested"; a For You
  algorithm that learns from watch time, likes, saves, follows and skips, mixes topics and
  keeps some new things in the feed; endless feed and pull-down to refresh.
- Version 3: own design ("Midnight Cinema": night-blue and gold (now violet), serif titles, floating dock,
  ticket panel on videos); the camera button opens Side's own camera (photo or video, flip,
  light, gallery, or write an idea).
- Version 4: smarter For You (video fingerprints, short- and long-term taste, topic bandit,
  variety mixing, live re-ranking after each swipe); sharper demo videos, cover pictures,
  fade-in without black flashes, gliding info panel; purple silk background.
- Version 5: videos slide sideways; "clips" not movies; plain "Your own idea" card; profile
  algorithm (Top/Latest/Most remixed, pins, insights and levels, taste match, similar creators);
  10 creators and 18 clips. Next: real stock footage (needs network approval) and real accounts.
- Version 6: post your own photos and videos as clips (camera preview, checks, saved copies, cover
  pictures, captions and #tags); fixed camera hand-over and sideways paging drift.
- Version 7: new "Deep Ocean" colors; native page swiper with no peeking at the next clip.
- Version 8: "Monochrome Studio" look (black and white with one red dot), chosen from 8 options.
- Version 9: swipe engine: skip/watched/rewatch signals, fresh mode after quick skips, adaptive
  preloading, resume on swipe-back, haptic tick and depth effect while swiping.
- Version 10: new layout (floating header island with feed picker, big centre camera button, corner
  menu), first real footage with credits.

Everything is saved on the phone. Video generation is in **preview mode** (sample clips).

## Next steps (each needs a decision or an account from the owner)

1. **Cloud backend** (accounts, sync, feed for everyone, storage). Suggested: Supabase
   (auth, Postgres database, file storage). Needs: a Supabase project.
2. **Real AI video generation.** A server function receives the scene plan and the person's photo,
   calls an AI video model, and stores the result. Candidates: Google Veo, Runway, Luma, Kling.
   Needs: an account and API key with one provider (paid per video).
   Swap `PreviewGenerator` in `src/ai/generator.ts` for a `CloudGenerator` that calls the server.
3. **Smarter AI Director**: send instructions to a language model on the server; keep the same
   `{ scenes, style, notes, reply }` result so screens don't change.
4. **Server moderation**: check prompts, uploaded photos and finished videos before anything is public.
   Face matching so people can only star as themselves. Human review queue for reports.
5. **Subscriptions**: free tier with a few videos per month, paid plans for more (RevenueCat for
   Google Play and App Store billing).
6. **Store release**: privacy policy, Google Play listing, age rating; then iPhone
   (Apple Developer account, $99/year).
