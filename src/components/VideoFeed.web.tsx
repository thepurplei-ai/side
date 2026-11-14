import { useIsFocused } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';

import VideoCard from '@/components/VideoCard';
import { SwipeSession } from '@/ai/swipe';
import type { FeedItem, SwipeInfo } from '@/components/feedTypes';
import { playbackDurations, playbackTimes } from '@/components/playback';

export type { FeedItem, SwipeInfo } from '@/components/feedTypes';

const nowMs = () => Date.now();

/**
 * Web version of the sideways feed (used only for testing in a browser; phones use VideoFeed.tsx).
 * Full-screen sideways feed: swipe left for the next video, right for the previous one.
 * One swipe = exactly one video. The neighbours are already loaded, so they start instantly.
 */
export default function VideoFeed({
  items,
  initialIndex = 0,
  bottomInset = 0,
  active = true,
  onEndReached,
  onActiveIndexChange,
}: {
  items: FeedItem[];
  initialIndex?: number;
  bottomInset?: number;
  /** False when this feed is not on screen. */
  active?: boolean;
  onEndReached?: () => void;
  /** Called when a swipe settles on a new video. */
  onActiveIndexChange?: (index: number, info: SwipeInfo) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [resume, setResume] = useState<{ index: number; time: number }>({ index: -1, time: 0 });
  const [session] = useState(() => {
    const s = new SwipeSession();
    const first = items[initialIndex];
    if (first) s.enter(initialIndex, first.video.id, first.video.source.durationSec ?? 6, nowMs());
    return s;
  });
  const focused = useIsFocused();
  const { width, height } = size;

  // Use the exact size (no rounding): rounding made pages drift a little more with every swipe
  // on phones whose screen width isn't a whole number of points.
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.abs(w - width) > 0.01 || Math.abs(h - height) > 0.01) setSize({ width: w, height: h });
  };

  // Switch videos only when the swipe has settled, so nothing stutters mid-swipe.
  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (i !== activeIndex) {
      const prev = items[activeIndex]?.video;
      const next = items[i].video;
      const t = nowMs();
      const kind = session.enter(i, next.id, playbackDurations.get(next.id) ?? next.source.durationSec ?? 6, t, prev ? playbackTimes.get(prev.id) : undefined);
      setResume({ index: i, time: session.resumeTime(next.id, t) });
      setActiveIndex(i);
      onActiveIndexChange?.(i, { kind, mood: session.mood(), prevVideoId: prev?.id });
    }
  };

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
      {width > 0 && height > 0 && (
        <FlatList
          data={items}
          horizontal
          keyExtractor={(it) => it.key}
          renderItem={({ item, index }) => (
            <VideoCard
              video={item.video}
              width={width}
              height={height}
              active={active && focused && index === activeIndex}
              // Keep the neighbours ready (loaded and paused) for an instant start.
              preload={Math.abs(index - activeIndex) <= 1}
              resumeAt={index === resume.index ? resume.time : undefined}
              bottomInset={bottomInset}
            />
          )}
          // One page = the full width: the phone's own paging does the snapping.
          pagingEnabled
          decelerationRate="fast"
          overScrollMode="never"
          bounces={false}
          directionalLockEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, items.length - 1))}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onSettled}
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={2}
        />
      )}
    </View>
  );
}
