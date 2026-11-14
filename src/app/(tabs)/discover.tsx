import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Body, Button, compactNumber, Title } from '@/components/ui';
import VideoGrid from '@/components/VideoGrid';
import { CLIP_COLORS } from '@/data/clipColors';
import { TEMPLATES } from '@/data/seed';
import { useStore } from '@/store/AppStore';
import { searchVideos, trending } from '@/store/selectors';
import { colors, radius, space } from '@/theme';

const TAGS = ['superhero', 'space', 'christmas', 'fantasy', 'family', 'ocean', 'scifi'];

export default function Discover() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const family = state.family.enabled;
  const templates = TEMPLATES.filter((t) => !family || t.familyFriendly);
  const creators = state.users.filter((u) => u.id !== state.me?.id).sort((a, b) => b.followers - a.followers);
  const results = query.trim() ? searchVideos(state, query) : trending(state);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
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
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.template, { backgroundColor: CLIP_COLORS[t.clip] }]}
                  onPress={() => router.push({ pathname: '/create', params: { template: t.id } })}>
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
  tagText: { color: colors.text, fontWeight: '700' },
  section: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: space.sm },
  template: { width: 150, height: 190, borderRadius: radius.lg, padding: space.md, justifyContent: 'space-between' },
  templateTitle: { color: '#fff', fontWeight: '900', fontSize: 17 },
  templateStyle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  creator: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  creatorName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  creatorMeta: { color: colors.textDim, fontSize: 13 },
});
