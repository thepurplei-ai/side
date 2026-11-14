import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import VideoCard from '@/components/VideoCard';
import type { Video } from '@/types';

export interface FeedItem {
  /** Unique key: the same video can appear again later in an endless feed. */
  key: string;
  video: Video;
}

const AnimatedPager = Animated.createAnimatedComponent(PagerView);

/** Only videos this close to the one on screen are built; the rest are empty pages. */
const WINDOW = 2;

/**
 * Full-screen sideways feed using the phone's own page swiper (exact pages, no drift).
 * Swipe left for the next clip, right for the previous one.
 * Nothing of the next clip shows at the edge: while you swipe, the incoming clip rises out
 * of black and only shows fully once it has landed.
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
  active?: boolean;
  onEndReached?: () => void;
  onActiveIndexChange?: (index: number) => void;
}) {
  const start = Math.min(initialIndex, Math.max(0, items.length - 1));
  const [activeIndex, setActiveIndex] = useState(start);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [position] = useState(() => new Animated.Value(start));
  const [offset] = useState(() => new Animated.Value(0));
  const [scroll] = useState(() => Animated.add(position, offset));
  const focused = useIsFocused();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size.height > 0 && (
        <AnimatedPager
          style={styles.fill}
          initialPage={start}
          orientation="horizontal"
          offscreenPageLimit={1}
          overdrag={false}
          overScrollMode="never"
          onPageScroll={Animated.event([{ nativeEvent: { position, offset } }], { useNativeDriver: true })}
          onPageSelected={(e: { nativeEvent: { position: number } }) => {
            const i = e.nativeEvent.position;
            setActiveIndex(i);
            onActiveIndexChange?.(i);
            if (i >= items.length - 3) onEndReached?.();
          }}>
          {items.map((item, index) => {
            const near = Math.abs(index - activeIndex) <= WINDOW;
            return (
              <View key={item.key} style={styles.page} collapsable={false}>
                {near && (
                  <VideoCard
                    video={item.video}
                    width={size.width}
                    height={size.height}
                    active={active && focused && index === activeIndex}
                    preload={Math.abs(index - activeIndex) <= 1}
                    bottomInset={bottomInset}
                  />
                )}
                {/* Black veil: fully dark when the page is off to the side, clear when it has landed. */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.veil,
                    { opacity: scroll.interpolate({ inputRange: [index - 1, index, index + 1], outputRange: [1, 0, 1], extrapolate: 'clamp' }) },
                  ]}
                />
              </View>
            );
          })}
        </AnimatedPager>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  page: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  veil: { backgroundColor: '#000' },
});
