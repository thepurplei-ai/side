import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { SwipeSession } from '@/ai/swipe';
import type { FeedItem, SwipeInfo } from '@/components/feedTypes';
import { playbackDurations, playbackTimes } from '@/components/playback';
import VideoCard from '@/components/VideoCard';

export type { FeedItem, SwipeInfo } from '@/components/feedTypes';

const AnimatedPager = Animated.createAnimatedComponent(PagerView);

const nowMs = () => Date.now();

/**
 * The sideways feed on phones, using the phone's own page swiper (exact pages, no drift).
 * Swipe left for the next clip, right for the previous one.
 *
 * The swipe engine (src/ai/swipe.ts) decides how many clips to load ahead and behind, how each
 * swipe counts (skip / glance / watched / rewatch), the mood (normal / fresh), and where to resume
 * a clip you come back to. While you swipe, the clip you leave sinks back and darkens and the next
 * one rises out of black, so nothing of it shows before it lands.
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
  onActiveIndexChange?: (index: number, info: SwipeInfo) => void;
}) {
  const start = Math.min(initialIndex, Math.max(0, items.length - 1));
  const [activeIndex, setActiveIndex] = useState(start);
  const [resume, setResume] = useState<{ index: number; time: number }>({ index: -1, time: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [position] = useState(() => new Animated.Value(start));
  const [offset] = useState(() => new Animated.Value(0));
  const [scroll] = useState(() => Animated.add(position, offset));
  const [session] = useState(() => {
    const s = new SwipeSession();
    const first = items[start];
    if (first) s.enter(start, first.video.id, first.video.source.durationSec ?? 6, nowMs());
    return s;
  });
  const focused = useIsFocused();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const onPageSelected = (e: { nativeEvent: { position: number } }) => {
    const i = e.nativeEvent.position;
    if (i === activeIndex) return;
    const prev = items[activeIndex]?.video;
    const next = items[i]?.video;
    if (!next) return;
    Haptics.selectionAsync().catch(() => {});
    const t = nowMs();
    const kind = session.enter(
      i,
      next.id,
      playbackDurations.get(next.id) ?? next.source.durationSec ?? 6,
      t,
      prev ? playbackTimes.get(prev.id) : undefined,
    );
    setResume({ index: i, time: session.resumeTime(next.id, t) });
    setActiveIndex(i);
    onActiveIndexChange?.(i, { kind, mood: session.mood(), prevVideoId: prev?.id });
    if (i >= items.length - 4) onEndReached?.();
  };

  const range = session.preloadRange(activeIndex, items.length);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size.height > 0 && (
        <AnimatedPager
          style={styles.fill}
          initialPage={start}
          orientation="horizontal"
          offscreenPageLimit={2}
          overdrag={false}
          overScrollMode="never"
          onPageScroll={Animated.event([{ nativeEvent: { position, offset } }], { useNativeDriver: true })}
          onPageSelected={onPageSelected}>
          {items.map((item, index) => {
            const loaded = index >= range.from && index <= range.to;
            const near = loaded || Math.abs(index - activeIndex) <= 1;
            const inputRange = [index - 1, index, index + 1];
            return (
              <View key={item.key} style={styles.page} collapsable={false}>
                {near && (
                  // Depth: a page off to the side sits slightly back and lags behind the finger a little.
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        transform: [
                          { translateX: scroll.interpolate({ inputRange, outputRange: [-size.width * 0.18, 0, size.width * 0.18], extrapolate: 'clamp' }) },
                          { scale: scroll.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' }) },
                        ],
                      },
                    ]}>
                    <VideoCard
                      video={item.video}
                      width={size.width}
                      height={size.height}
                      active={active && focused && index === activeIndex}
                      preload={loaded}
                      resumeAt={index === resume.index ? resume.time : undefined}
                      bottomInset={bottomInset}
                    />
                  </Animated.View>
                )}
                {/* Black veil: fully dark when the page is off to the side, clear when it has landed. */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.veil,
                    { opacity: scroll.interpolate({ inputRange, outputRange: [1, 0, 1], extrapolate: 'clamp' }) },
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
