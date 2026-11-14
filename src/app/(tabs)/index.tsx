import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Backdrop from '@/components/Backdrop';
import { Body, Button, Card, EmptyState, Notice, Title } from '@/components/ui';
import { useDockSpace } from '@/components/Dock';
import VideoFeed, { type FeedItem, type SwipeInfo } from '@/components/VideoFeed';
import { CLIP_COLORS } from '@/data/clipColors';
import { TEMPLATES } from '@/data/seed';
import { type AppState, useStore } from '@/store/AppStore';
import { followingFeed, forYouFeed } from '@/store/selectors';
import type { Video } from '@/types';
import { colors, radius, space, fonts } from '@/theme';

/** In Family Mode the public feed is hidden. Parents see their family's private stories and gentle ideas instead. */
function FamilyHome() {
  const dockSpace = useDockSpace();
  const { state } = useStore();
  const stories = state.projects.filter((p) => p.familyChildId);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: dockSpace + space.lg }}>
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
                <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{p.title}</Text>
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

type Page = 'following' | 'forYou';
const PAGES: Page[] = ['following', 'forYou'];
const MAX_ROUNDS = 6;

function newSeed() {
  return `${Date.now()}-${Math.random()}`;
}

function makeRound(state: AppState, context: Video[] = []): string[] {
  const ids = forYouFeed(state, newSeed(), context).map((v) => v.id);
  // Don't show the same video twice in a row where one round ends and the next starts.
  const prevLast = context[context.length - 1]?.id;
  if (ids.length > 1 && ids[0] === prevLast) ids.push(ids.shift()!);
  return ids;
}

export default function Home() {
  const { state, dispatch } = useStore();
  const dockSpace = useDockSpace();
  const [page, setPage] = useState<Page>('forYou');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // "For You" order is fixed until you refresh (tap "For You" again), so videos don't jump around
  // while you watch. When you near the end, another round is added, so the feed keeps going.
  const [rounds, setRounds] = useState<string[][]>(() => [makeRound(state)]);

  if (state.family.enabled) return <FamilyHome />;

  const visible = (id: string) => {
    const v = state.videos.find((x) => x.id === id);
    return v && v.visibility === 'public' && !state.hidden[id] && !state.notInterested[id] ? v : undefined;
  };
  const flat = rounds.flatMap((ids, r) =>
    ids.flatMap((id, pos) => {
      const v = visible(id);
      return v ? [{ key: `${r}-${id}`, video: v, r, pos }] : [];
    }),
  );
  const forYouItems: FeedItem[] = flat;

  // Live adapting: after every swipe, the videos you haven't reached yet in this round are ranked
  // again with everything you just did. The very next video stays put (it's already loaded).
  const onSwipe = (i: number, info: SwipeInfo) => {
    // Swiping back to a clip and watching it again is a strong "I liked it".
    if (info.kind === 'rewatch' && info.prevVideoId) dispatch({ type: 'rewatch', videoId: info.prevVideoId });
    const next = flat[i + 1];
    if (!next) return;
    const round = rounds[next.r];
    const keep = round.slice(0, next.pos + 1);
    const rest = round.slice(next.pos + 1);
    if (rest.length < 2) return;
    const context = flat.slice(Math.max(0, i - 1), i + 2).map((x) => x.video);
    // After a run of quick skips (mood 'fresh'), the coming clips get more variety and new topics.
    const reranked = forYouFeed(state, newSeed(), context, new Set(rest), info.mood).map((v) => v.id);
    const missing = rest.filter((id) => !reranked.includes(id)); // e.g. hidden: keep them at the end
    const updated = [...rounds];
    updated[next.r] = [...keep, ...reranked, ...missing];
    setRounds(updated);
  };
  const followingItems: FeedItem[] = followingFeed(state).map((v) => ({ key: v.id, video: v }));

  const refresh = () => {
    setRounds([makeRound(state)]);
    setRefreshCount((n) => n + 1);
  };
  const more = () => {
    if (rounds.length >= MAX_ROUNDS) return;
    setRounds([...rounds, makeRound(state, flat.slice(-3).map((x) => x.video))]);
  };

  // The header picker: choose For You or Following. Choosing For You again gives a fresh order.
  const choose = (p: Page) => {
    setPickerOpen(false);
    if (p === page) {
      if (p === 'forYou') refresh();
      return;
    }
    setPage(p);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {page === 'forYou' ? (
        forYouItems.length > 0 ? (
          <VideoFeed key={`forYou-${refreshCount}`} items={forYouItems} onEndReached={more} onActiveIndexChange={onSwipe} bottomInset={dockSpace} />
        ) : (
          <EmptyState icon="sparkles-outline" title="Nothing new right now" text="Be the first to create something!" action={<Button title="Open the camera" onPress={() => router.push('/camera')} />} />
        )
      ) : followingItems.length > 0 ? (
        <VideoFeed key="following" items={followingItems} bottomInset={dockSpace} />
      ) : (
        <EmptyState
          icon="people-outline"
          title="No videos here yet"
          text="Follow creators to see their newest videos here."
          action={<Button title="Discover creators" onPress={() => router.push('/discover')} />}
        />
      )}
      {/* Header: one floating island with the logo and the feed picker. */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.island}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} accessibilityLabel="side" />
          <View style={styles.divider} />
          <Pressable onPress={() => setPickerOpen((o) => !o)} hitSlop={8} style={styles.picker} accessibilityRole="button" accessibilityLabel="Choose feed">
            <Text style={styles.pickerText}>{page === 'forYou' ? 'For You' : 'Following'}</Text>
            <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text} />
          </Pressable>
        </View>
        {pickerOpen && (
          <View style={styles.menu}>
            {PAGES.slice().reverse().map((p) => (
              <Pressable key={p} onPress={() => choose(p)} style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{p === 'forYou' ? 'For You' : 'Following'}</Text>
                  <Text style={styles.menuHint}>
                    {p === 'forYou' ? (page === 'forYou' ? 'Tap to get a fresh mix' : 'Picked for your taste') : 'Newest from people you follow'}
                  </Text>
                </View>
                {page === p && <Ionicons name="checkmark" size={18} color={colors.text} />}
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: space.sm, gap: 6 },
  island: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, marginTop: space.sm,
    borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  logo: { width: 55, height: 18, resizeMode: 'contain' },
  divider: { width: 1, height: 16, backgroundColor: colors.glassBorder },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickerText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 14 },
  menu: { width: 250, padding: 6, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md },
  menuLabel: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15 },
  menuHint: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12 },
  section: { color: colors.text, fontSize: 18, fontFamily: fonts.heavy, marginTop: space.sm },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  ideaText: { color: '#fff', fontFamily: fonts.heavy },
});
