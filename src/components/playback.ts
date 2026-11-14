// Where each clip is right now (seconds) and how long it is, shared between the video cards and the
// sideways feed. The feed reads these when you swipe, so the swipe engine knows how much you watched
// and where to resume.
export const playbackTimes = new Map<string, number>();
export const playbackDurations = new Map<string, number>();
