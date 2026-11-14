import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { insights, knownFor, type ProfileSort } from '@/ai/profile';
import ProfileHeader from '@/components/ProfileHeader';
import { CreatorsRow, InsightsCard, KnownFor, SortChips } from '@/components/ProfileParts';
import { Body, Button, EmptyState } from '@/components/ui';
import VideoGrid from '@/components/VideoGrid';
import { useStore } from '@/store/AppStore';
import { creatorMatch, profileClips, suggestedCreators } from '@/store/selectors';
import { space } from '@/theme';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const [sort, setSort] = useState<ProfileSort>('top');
  const user = state.users.find((u) => u.id === id);
  if (!user) return <EmptyState icon="person-outline" title="User not found" text="" />;
  if (user.id === state.me?.id) {
    router.replace('/profile');
    return null;
  }
  const clips = profileClips(state, user.id, sort);
  const following = !!state.following[user.id];
  const stats = insights(user, clips, state.comments, state.videos);
  const match = creatorMatch(state, user.id);
  const similar = suggestedCreators(state, user.id, 4);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl }}>
      <Stack.Screen options={{ title: `@${user.username}` }} />
      <ProfileHeader user={user} following={0} likes={clips.reduce((s, v) => s + v.likes, 0)} videos={clips.length} />
      <KnownFor tags={knownFor(clips)} match={match} />
      <Button title={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'} onPress={() => dispatch({ type: 'toggleFollow', userId: user.id })} />
      <InsightsCard insights={stats} title="Creator stats" />
      {clips.length > 1 && <SortChips sort={sort} onChange={setSort} />}
      {clips.length === 0 ? <Body dim>No clips yet.</Body> : <VideoGrid videos={clips} listKey={`user:${user.id}`} bestId={stats.bestClipId} />}
      <CreatorsRow title="Similar creators" users={similar} />
    </ScrollView>
  );
}
