import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { compactNumber } from '@/components/ui';
import { CLIP_COLORS } from '@/data/clipColors';
import { colors, radius } from '@/theme';
import type { Video } from '@/types';

/** A three-column grid of video tiles. Tapping one opens it full screen. */
export default function VideoGrid({ videos, listKey }: { videos: Video[]; listKey: string }) {
  return (
    <View style={styles.grid}>
      {videos.map((v, i) => (
        <Pressable
          key={v.id}
          style={styles.tile}
          onPress={() => router.push({ pathname: '/video/[id]', params: { id: v.id, list: listKey, index: String(i) } })}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: CLIP_COLORS[v.source.clip ?? 'fantasy'] }]} />
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
  tileTitle: { color: '#fff', fontWeight: '800', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLikes: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
