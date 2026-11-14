import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Backdrop from '@/components/Backdrop';
import { useDockSpace } from '@/components/Dock';
import OwnIdeaCard from '@/components/OwnIdeaCard';
import { Avatar, Body, Button, compactNumber, Title } from '@/components/ui';
import VideoGrid from '@/components/VideoGrid';
import { CLIP_COLORS } from '@/data/clipColors';
import { posterForClip } from '@/data/clips';
import { TEMPLATES } from '@/data/seed';
import { useStore } from '@/store/AppStore';
import { searchVideos, trending } from '@/store/selectors';
import { colors, radius, space, fonts } from '@/theme';

const TAGS = ['superhero', 'space', 'christmas', 'fantasy', 'family', 'ocean', 'scifi'];

export default function Discover() {
  const dockSpace = useDockSpace();
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const family = state.family.enabled;
  const templates = TEMPLATES.filter((t) => !family || t.familyFriendly);
  const creators = state.users.filter((u) => u.id !== state.me?.id).sort((a, b) => b.followers - a.followers);
  const results = query.trim() ? searchVideos(state, query) : trending(state);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: dockSpace + space.lg }} keyboardShouldPersistTaps="handled">
        <Title>Discover</Title>

        {!family && (
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={colors.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos, creators, #tags"
              placeholderTextColor={colors.textDim}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {!!query && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textDim} />
              </Pressable>
            )}
          </View>
        )}

        {!family && !query && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {TAGS.map((t) => (
              <Pressable key={t} style={styles.tag} onPress={() => setQuery(t)}>
                <Text style={styles.tagText}>#{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {!query && (
          <>
            <Text style={styles.section}>AI templates</Text>
            <Body dim>Pick a story and star in it. Add your photo on the next screen.</Body>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              <OwnIdeaCard style={{ width: 150, height: 190 }} />
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.template, { backgroundColor: CLIP_COLORS[t.clip] }]}
                  onPress={() => router.push({ pathname: '/create', params: { template: t.id } })}>
                  <Image source={posterForClip(t.clip)} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="sparkles" size={22} color="#fff" />
                  <View>
                    <Text style={styles.templateTitle}>{t.title}</Text>
                    <Text style={styles.templateStyle}>{t.style}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {!family && (
          <>
            {!query && (
              <>
                <Text style={styles.section}>Top creators</Text>
                {creators.map((u) => {
                  const following = !!state.following[u.id];
                  return (
                    <Pressable key={u.id} style={styles.creator} onPress={() => router.push(`/user/${u.id}`)}>
                      <Avatar name={u.displayName} color={u.avatarColor} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.creatorName}>{u.displayName}</Text>
                        <Text style={styles.creatorMeta}>@{u.username} · {compactNumber(u.followers)} followers</Text>
                      </View>
                      <Button small title={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'} onPress={() => dispatch({ type: 'toggleFollow', userId: u.id })} />
                    </Pressable>
                  );
                })}
              </>
            )}
            <Text style={styles.section}>{query ? `Results for “${query}”` : 'Trending now'}</Text>
            {results.length === 0 ? <Body dim>No videos found.</Body> : <VideoGrid videos={results} listKey={query ? `search:${query}` : 'trending'} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface,
    borderRadius: radius.pill, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  tag: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface2 },
  tagText: { color: colors.text, fontFamily: fonts.bold },
  section: { color: colors.text, fontSize: 19, fontFamily: fonts.heavy, marginTop: space.sm },
  template: { width: 150, height: 190, borderRadius: radius.lg, padding: space.md, justifyContent: 'space-between' , overflow: 'hidden' },
  templateTitle: { color: '#fff', fontFamily: fonts.heavy, fontSize: 17 },
  templateStyle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: fonts.bold },
  creator: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  creatorName: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  creatorMeta: { color: colors.textDim, fontSize: 13 },
});
