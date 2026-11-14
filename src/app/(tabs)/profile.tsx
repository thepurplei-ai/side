import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Silk from '@/components/Silk';
import { useDockSpace } from '@/components/Dock';
import ProfileHeader from '@/components/ProfileHeader';
import { Body, Button, Chip } from '@/components/ui';
import VideoGrid from '@/components/VideoGrid';
import { useStore } from '@/store/AppStore';
import { videosByUser } from '@/store/selectors';
import { colors, radius, space, fonts } from '@/theme';

type Tab = 'videos' | 'saved' | 'liked';

export default function Profile() {
  const dockSpace = useDockSpace();
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>('videos');
  const me = state.me!;
  const family = state.family.enabled;
  const mine = videosByUser(state, me.id);
  const lists = {
    videos: mine,
    saved: state.videos.filter((v) => state.saved[v.id]),
    liked: state.videos.filter((v) => state.liked[v.id]),
  };
  const likes = mine.reduce((s, v) => s + v.likes, 0);

  const resetApp = () =>
    Alert.alert('Delete everything?', 'This removes your account, projects and videos from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'reset' }) },
    ]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Silk />
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: dockSpace + space.lg }}>
        <ProfileHeader user={me} following={Object.keys(state.following).length} likes={likes} videos={mine.length} />

        <View style={styles.buttons}>
          <Button small title="Edit profile" variant="secondary" icon="create-outline" onPress={() => router.push('/edit-profile')} style={{ flex: 1 }} />
          <Button small title={family ? 'Family Mode: ON' : 'Family Mode'} variant={family ? 'family' : 'secondary'} icon="people-outline" onPress={() => router.push('/family')} style={{ flex: 1 }} />
        </View>

        {family ? (
          <Body dim style={{ textAlign: 'center' }}>Your public videos are hidden while Family Mode is on.</Body>
        ) : (
          <>
            <View style={styles.tabs}>
              {(['videos', 'saved', 'liked'] as Tab[]).map((t) => (
                <Chip key={t} label={t === 'videos' ? `Videos (${lists.videos.length})` : t === 'saved' ? `Saved (${lists.saved.length})` : `Liked (${lists.liked.length})`} selected={tab === t} onPress={() => setTab(t)} />
              ))}
            </View>
            {lists[tab].length === 0 ? (
              <Body dim style={{ textAlign: 'center', marginVertical: space.lg }}>
                {tab === 'videos' ? 'Publish a video from the Studio and it shows up here.' : tab === 'saved' ? 'Tap the bookmark on a video to save it.' : 'Videos you like show up here.'}
              </Body>
            ) : (
              <VideoGrid videos={lists[tab]} listKey={tab === 'videos' ? `user:${me.id}` : tab} />
            )}
          </>
        )}

        <View style={styles.settings}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Row icon="shield-checkmark-outline" text={`Reports sent: ${state.reports.length}`} />
          <Row icon="lock-closed-outline" text="Your photos and videos stay on this phone in this version." />
          <Row icon="trash-outline" text="Delete my account and data" color={colors.danger} onPress={resetApp} />
        </View>
        <Text style={styles.version}>Side · early preview</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, text, onPress, color = colors.text }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress?: () => void; color?: string }) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowText, { color }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: space.sm },
  tabs: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', flexWrap: 'wrap' },
  settings: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.md, marginTop: space.lg, borderWidth: 1, borderColor: colors.border },
  settingsTitle: { color: colors.textDim, fontFamily: fonts.heavy, textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  rowText: { fontSize: 15, flex: 1 },
  version: { color: colors.textDim, textAlign: 'center', fontSize: 12 },
});
