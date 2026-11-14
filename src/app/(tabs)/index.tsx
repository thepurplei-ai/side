import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, EmptyState, Notice, Title } from '@/components/ui';
import VideoFeed from '@/components/VideoFeed';
import { CLIP_COLORS } from '@/data/clipColors';
import { TEMPLATES } from '@/data/seed';
import { useStore } from '@/store/AppStore';
import { homeFeed } from '@/store/selectors';
import { colors, radius, space } from '@/theme';

/** In Family Mode the public feed is hidden. Parents see their family's private stories and gentle ideas instead. */
function FamilyHome() {
  const { state } = useStore();
  const stories = state.projects.filter((p) => p.familyChildId);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
        <Title>Family stories</Title>
        <Notice icon="shield-checkmark" color={colors.family} text="Family Mode is on. The public feed, comments and publishing are switched off. Everything you make stays private on this phone." />
        <Text style={styles.section}>Start a magical story</Text>
        <View style={styles.ideas}>
          {TEMPLATES.filter((t) => t.familyFriendly).map((t) => (
            <Pressable key={t.id} style={[styles.idea, { backgroundColor: CLIP_COLORS[t.clip] }]} onPress={() => router.push({ pathname: '/create', params: { template: t.id } })}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.ideaText}>{t.title}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Your family’s stories</Text>
        {stories.length === 0 ? (
          <Body dim>Nothing yet. Tap an idea above to make your first story together.</Body>
        ) : (
          stories.map((p) => (
            <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name="film" size={22} color={colors.family} />
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/project/${p.id}`)}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{p.title}</Text>
                <Text style={{ color: colors.textDim }}>
                  {state.family.children.find((c) => c.id === p.familyChildId)?.name ?? 'Family'} · {p.status === 'ready' ? 'Ready to watch' : p.status}
                </Text>
              </Pressable>
            </Card>
          ))
        )}
        <Button title="Family Mode settings" icon="settings-outline" variant="ghost" onPress={() => router.push('/family')} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Home() {
  const { state } = useStore();
  const [tab, setTab] = useState<'forYou' | 'following'>('forYou');
  if (state.family.enabled) return <FamilyHome />;

  const all = homeFeed(state);
  const videos = tab === 'following' ? all.filter((v) => state.following[v.creatorId]) : all;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {videos.length > 0 ? (
        <VideoFeed key={tab} videos={videos} />
      ) : (
        <EmptyState
          icon="people-outline"
          title="No videos here yet"
          text={tab === 'following' ? 'Follow creators to see their videos here.' : 'Be the first to create something!'}
          action={<Button title="Discover creators" onPress={() => router.push('/discover')} />}
        />
      )}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.tabs}>
          {(['following', 'forYou'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} hitSlop={8}>
              <Text style={[styles.tab, tab === t && styles.tabActive]}>{t === 'forYou' ? 'For You' : 'Following'}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: space.lg, paddingTop: space.sm },
  tab: { color: 'rgba(255,255,255,0.6)', fontSize: 17, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  tabActive: { color: '#fff', textDecorationLine: 'underline' },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: space.sm },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  ideaText: { color: '#fff', fontWeight: '800' },
});
