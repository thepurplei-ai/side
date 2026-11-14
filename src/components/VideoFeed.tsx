import { useIsFocused } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, LayoutChangeEvent, View } from 'react-native';

import VideoCard from '@/components/VideoCard';
import type { Video } from '@/types';

type ViewToken = { index?: number | null; isViewable: boolean };

/** Full-screen vertical feed: swipe up and down, one video at a time. */
export default function VideoFeed({ videos, initialIndex = 0, bottomInset = 0 }: { videos: Video[]; initialIndex?: number; bottomInset?: number }) {
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const focused = useIsFocused();

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setActiveIndex(first.index);
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: height, offset: height * index, index }),
    [height],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
      {height > 0 && (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          renderItem={({ item, index }) => (
            <VideoCard video={item} height={height} active={focused && index === activeIndex} bottomInset={bottomInset} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, videos.length - 1))}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          decelerationRate="fast"
        />
      )}
    </View>
  );
}
