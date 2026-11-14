import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import ProfileHeader from '@/components/ProfileHeader';
import { Body, Button, EmptyState } from '@/components/ui';
import VideoGrid from '@/components/VideoGrid';
import { useStore } from '@/store/AppStore';
import { videosByUser } from '@/store/selectors';
import { space } from '@/theme';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const user = state.users.find((u) => u.id === id);
  if (!user) return <EmptyState icon="person-outline" title="User not found" text="" />;
  if (user.id === state.me?.id) {
    router.replace('/profile');
    return null;
  }
  const videos = videosByUser(state, user.id);
  const following = !!state.following[user.id];
  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Stack.Screen options={{ title: `@${user.username}` }} />
      <ProfileHeader user={user} following={0} likes={videos.reduce((s, v) => s + v.likes, 0)} videos={videos.length} />
      <Button title={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'} onPress={() => dispatch({ type: 'toggleFollow', userId: user.id })} />
      {videos.length === 0 ? <Body dim>No videos yet.</Body> : <VideoGrid videos={videos} listKey={`user:${user.id}`} />}
    </ScrollView>
  );
}
