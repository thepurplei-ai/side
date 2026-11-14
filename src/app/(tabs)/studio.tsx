import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Silk from '@/components/Silk';
import { useDockSpace } from '@/components/Dock';
import { totalDuration } from '@/ai/director';
import { Button, EmptyState, timeAgo, Title } from '@/components/ui';
import { CLIP_COLORS } from '@/data/clipColors';
import { useStore } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';
import type { Project } from '@/types';

const STATUS: Record<Project['status'], { text: string; color: string }> = {
  draft: { text: 'Draft', color: colors.textDim },
  generating: { text: 'Making…', color: colors.warning },
  ready: { text: 'Ready', color: colors.success },
  failed: { text: 'Failed', color: colors.danger },
};

export default function Studio() {
  const dockSpace = useDockSpace();
  const { state } = useStore();
  const family = state.family.enabled;
  // In Family Mode only family stories are shown.
  const projects = state.projects.filter((p) => !family || p.familyChildId);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Silk />
      <View style={styles.header}>
        <Title>Studio</Title>
        <Text style={styles.count}>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</Text>
      </View>
      {projects.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title="No projects yet"
          text="Everything you create is saved here. Edit scenes with the AI Director, make the video, then publish it."
          action={<Button title="Open the camera" icon="camera" onPress={() => router.push('/camera')} />}
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: space.md, gap: space.sm, paddingBottom: dockSpace + space.lg }}
          renderItem={({ item: p }) => {
            const st = STATUS[p.status];
            const child = state.family.children.find((c) => c.id === p.familyChildId);
            return (
              <Pressable style={styles.item} onPress={() => router.push(`/project/${p.id}`)}>
                <View style={[styles.thumb, { backgroundColor: p.result?.clip ? CLIP_COLORS[p.result.clip] : colors.surface2 }]}>
                  <Ionicons name={p.status === 'ready' ? 'play' : p.status === 'generating' ? 'hourglass' : 'create-outline'} size={22} color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {p.scenes.length} scenes · {totalDuration(p.scenes)}s · {p.style} · {timeAgo(p.updatedAt)}
                  </Text>
                  <View style={styles.badges}>
                    <Text style={[styles.badge, { color: st.color }]}>
                      {st.text}
                      {p.status === 'generating' ? ` ${Math.round(p.progress * 100)}%` : ''}
                    </Text>
                    {p.publishedVideoId && <Text style={[styles.badge, { color: colors.primary }]}>Published</Text>}
                    {p.remixOfId && <Text style={[styles.badge, { color: colors.warning }]}>My Version</Text>}
                    {p.familyChildId && <Text style={[styles.badge, { color: colors.family }]}>Family · {child?.name ?? 'Everyone'}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.md, paddingTop: space.md },
  count: { color: colors.textDim, fontFamily: fonts.bold },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  thumb: { width: 54, height: 72, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  meta: { color: colors.textDim, fontSize: 13 },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  badge: { fontSize: 12, fontFamily: fonts.heavy },
});
