import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, EmptyState, Notice, Title } from '@/components/ui';
import { useDockSpace } from '@/components/Dock';
import VideoFeed, { type FeedItem } from '@/components/VideoFeed';
import { CLIP_COLORS } from '@/data/clipColors';
import { TEMPLATES } from '@/data/seed';
import { type AppState, useStore } from '@/store/AppStore';
import { followingFeed, forYouFeed } from '@/store/selectors';
import { colors, radius, space, fonts } from '@/theme';

/** In Family Mode the public feed is hidden. Parents see their family's private stories and gentle ideas instead. */
function FamilyHome() {
  const dockSpace = useDockSpace();
  const { state } = useStore();
  const stories = state.projects.filter((p) => p.familyChildId);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
const MAX_ROUNDS = 20;
const SWITCH_W = 96;

function makeRound(state: AppState, prevLast?: string): string[] {
  const ids = forYouFeed(state, `${Date.now()}-${Math.random()}`).map((v) => v.id);
  // Don't show the same video twice in a row where one round ends and the next starts.
  if (ids.length > 1 && ids[0] === prevLast) ids.push(ids.shift()!);
  return ids;
}

export default function Home() {
  const { state } = useStore();
  const { width } = useWindowDimensions();
  const [pageHeight, setPageHeight] = useState(0);
  const dockSpace = useDockSpace();
  const [page, setPage] = useState<Page>('forYou');
  const pagerRef = useRef<FlatList<Page>>(null);
  const [scrollX] = useState(() => new Animated.Value(width));

  // "For You" order is fixed until you pull down to refresh, so videos don't jump around while
  // you watch. When you near the end, another round is added, so the feed keeps going.
  const [rounds, setRounds] = useState<string[][]>(() => [makeRound(state)]);

  if (state.family.enabled) return <FamilyHome />;

  const visible = (id: string) => {
    const v = state.videos.find((x) => x.id === id);
    return v && v.visibility === 'public' && !state.hidden[id] && !state.notInterested[id] ? v : undefined;
  };
  const forYouItems: FeedItem[] = rounds.flatMap((ids, r) =>
    ids.flatMap((id) => {
      const v = visible(id);
      return v ? [{ key: `${r}-${id}`, video: v }] : [];
    }),
  );
  const followingItems: FeedItem[] = followingFeed(state).map((v) => ({ key: v.id, video: v }));

  const refresh = () => setRounds([makeRound(state)]);
  const more = () => {
    if (rounds.length >= MAX_ROUNDS) return;
    const last = rounds[rounds.length - 1];
    setRounds([...rounds, makeRound(state, last[last.length - 1])]);
  };

  const goTo = (p: Page) => {
    pagerRef.current?.scrollToIndex({ index: PAGES.indexOf(p), animated: true });
    setPage(p);
  };

  const thumbX = scrollX.interpolate({ inputRange: [0, width], outputRange: [0, SWITCH_W], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={(e) => setPageHeight(Math.round(e.nativeEvent.layout.height))}>
      {pageHeight > 0 && (
      <Animated.FlatList
        ref={pagerRef}
        data={PAGES}
        keyExtractor={(p) => p}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={1}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(PAGES[Math.round(e.nativeEvent.contentOffset.x / width)] ?? 'forYou')}
        renderItem={({ item }) => (
          <View style={{ width, height: pageHeight }}>
            {item === 'forYou' ? (
              forYouItems.length > 0 ? (
                <VideoFeed items={forYouItems} active={page === 'forYou'} onRefresh={refresh} onEndReached={more} bottomInset={dockSpace} />
              ) : (
                <EmptyState icon="sparkles-outline" title="Nothing new right now" text="Be the first to create something!" action={<Button title="Create" onPress={() => router.push('/create')} />} />
              )
            ) : followingItems.length > 0 ? (
              <VideoFeed items={followingItems} active={page === 'following'} bottomInset={dockSpace} />
            ) : (
              <EmptyState
                icon="people-outline"
                title="No videos here yet"
                text="Follow creators to see their newest videos here. Swipe left to go back to For You."
                action={<Button title="Discover creators" onPress={() => router.push('/discover')} />}
              />
            )}
          </View>
        )}
      />
      )}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} accessibilityLabel="side" />
        {/* Sliding switch: follows your finger as you swipe sideways. */}
        <View style={styles.switch}>
          <Animated.View style={[styles.switchThumb, { transform: [{ translateX: thumbX }] }]} />
          {PAGES.map((p) => (
            <Pressable key={p} onPress={() => goTo(p)} hitSlop={6} style={styles.switchButton}>
              <Text style={[styles.switchText, page === p && styles.switchTextActive]}>{p === 'forYou' ? 'For You' : 'Following'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ width: 67 }} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, paddingTop: space.sm },
  logo: { width: 67, height: 22, resizeMode: 'contain' },
  switch: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, marginTop: space.sm },
  switchThumb: { position: 'absolute', top: 3, left: 3, width: SWITCH_W, bottom: 3, borderRadius: radius.pill, backgroundColor: colors.primary },
  switchButton: { width: SWITCH_W, paddingVertical: 7, alignItems: 'center' },
  switchText: { color: colors.textDim, fontFamily: fonts.heavy, fontSize: 13.5 },
  switchTextActive: { color: colors.onPrimary },
  section: { color: colors.text, fontSize: 18, fontFamily: fonts.heavy, marginTop: space.sm },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  ideaText: { color: '#fff', fontFamily: fonts.heavy },
});
