import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { EmptyState } from '@/components/ui';
import VideoFeed from '@/components/VideoFeed';
import { useStore } from '@/store/AppStore';
import { listByKey } from '@/store/selectors';

/** Opens a video full screen. You can keep swiping through the list it came from. */
export default function VideoScreen() {
  const { id, list } = useLocalSearchParams<{ id: string; list?: string }>();
  const { state } = useStore();
  // Keep the list fixed while this screen is open, so liking a video does not reshuffle it.
  const videos = useMemo(() => {
    const l = list ? listByKey(state, list) : [];
    const v = state.videos.find((x) => x.id === id);
    return l.some((x) => x.id === id) ? l : v ? [v] : [];
  }, [id, list]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = videos.map((v) => state.videos.find((x) => x.id === v.id)).filter((v) => !!v);
  const index = Math.max(0, live.findIndex((v) => v.id === id));
  if (live.length === 0) return <EmptyState icon="videocam-off-outline" title="Video not available" text="It may have been removed." />;
  return <VideoFeed videos={live} initialIndex={index} />;
}
