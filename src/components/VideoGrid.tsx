import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { compactNumber } from '@/components/ui';
import { CLIP_COLORS } from '@/data/clipColors';
import { posterFor } from '@/data/clips';
import { colors, radius, fonts } from '@/theme';
import type { Video } from '@/types';

/** A three-column grid of video tiles. Tapping one opens it full screen. */
export default function VideoGrid({
  videos, listKey, leading, pinned, bestId, onLongPress,
}: {
  videos: Video[];
  listKey: string;
  leading?: ReactNode;
  /** Clips pinned to the top of a profile (shown with a pin). */
  pinned?: Record<string, true>;
  /** The creator's best clip (shown with a "Best" badge). */
  bestId?: string;
  onLongPress?: (v: Video) => void;
}) {
  return (
    <View style={styles.grid}>
      {leading && <View style={styles.tileFrame}>{leading}</View>}
      {videos.map((v, i) => (
        <Pressable
          key={v.id}
          style={styles.tile}
          onLongPress={onLongPress ? () => onLongPress(v) : undefined}
          onPress={() => router.push({ pathname: '/video/[id]', params: { id: v.id, list: listKey, index: String(i) } })}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: CLIP_COLORS[v.source.clip ?? 'fantasy'] }]} />
          {posterFor(v.source) !== undefined && <Image source={posterFor(v.source)} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          <View style={styles.badges}>
            {pinned?.[v.id] && <Ionicons name="pin" size={14} color={colors.lemon} />}
            {bestId === v.id && <Text style={styles.best}>BEST</Text>}
          </View>
          <Text style={styles.tileTitle} numberOfLines={3}>{v.title}</Text>
          <View style={styles.tileFooter}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={styles.tileLikes}>{compactNumber(v.likes)}</Text>
            {v.visibility !== 'public' && <Ionicons name="lock-closed" size={12} color="#fff" style={{ marginLeft: 'auto' }} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  tile: { width: '32.6%', aspectRatio: 9 / 16, borderRadius: radius.sm, overflow: 'hidden', padding: 8, justifyContent: 'space-between', backgroundColor: colors.surface2 },
  tileFrame: { width: '32.6%', aspectRatio: 9 / 16 },
  badges: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 4, alignItems: 'center' },
  best: { color: colors.onPrimary, backgroundColor: colors.primary, fontFamily: fonts.heavy, fontSize: 9, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  tileTitle: { color: '#fff', fontFamily: fonts.heavy, fontSize: 13, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLikes: { color: '#fff', fontSize: 12, fontFamily: fonts.bold },
});
