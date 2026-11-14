import { useIsFocused } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, View } from 'react-native';

import VideoCard from '@/components/VideoCard';
import { colors } from '@/theme';
import type { Video } from '@/types';

export interface FeedItem {
  /** Unique key: the same video can appear again further down an endless feed. */
  key: string;
  video: Video;
}

/**
 * Full-screen vertical feed: one swipe = exactly one video.
 * The next and previous videos are already loaded, so they start instantly.
 */
export default function VideoFeed({
  items,
  initialIndex = 0,
  bottomInset = 0,
  active = true,
  onRefresh,
  onEndReached,
  onActiveIndexChange,
}: {
  items: FeedItem[];
  initialIndex?: number;
  bottomInset?: number;
  /** False when this feed is not the one on screen (for example the other Home page). */
  active?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  /** Called when a swipe settles on a new video. */
  onActiveIndexChange?: (index: number) => void;
}) {
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const focused = useIsFocused();

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  // Switch videos only when the swipe has settled, so nothing stutters mid-swipe.
  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!height) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / height)));
    if (i !== activeIndex) {
      setActiveIndex(i);
      onActiveIndexChange?.(i);
    }
  };

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: height, offset: height * index, index }),
    [height],
  );

  const refresh = () => {
    if (!onRefresh) return;
    setRefreshing(true);
    onRefresh();
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
      {height > 0 && (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.key}
          renderItem={({ item, index }) => (
            <VideoCard
              video={item.video}
              height={height}
              active={active && focused && index === activeIndex}
              // Keep the neighbours ready (loaded and paused) for an instant start.
              preload={Math.abs(index - activeIndex) <= 1}
              bottomInset={bottomInset}
            />
          )}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, items.length - 1))}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onSettled}
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={2}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[colors.primary]} progressViewOffset={60} /> : undefined
          }
        />
      )}
    </View>
  );
}
