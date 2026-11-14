import { StyleSheet, Text, View } from 'react-native';

import { Avatar, compactNumber } from '@/components/ui';
import { colors, space, fonts } from '@/theme';
import type { User } from '@/types';

export default function ProfileHeader({ user, following, likes, videos }: { user: User; following: number; likes: number; videos: number }) {
  return (
    <View style={styles.wrap}>
      <Avatar name={user.displayName} color={user.avatarColor} size={88} />
      <Text style={styles.name}>{user.displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      <View style={styles.stats}>
        <Stat n={following} label="Following" />
        <Stat n={user.followers} label="Followers" />
        <Stat n={likes} label="Likes" />
        <Stat n={videos} label="Videos" />
      </View>
      {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statN}>{compactNumber(n)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 26, fontFamily: fonts.display, marginTop: space.sm },
  username: { color: colors.textDim, fontSize: 15 },
  stats: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
  statN: { color: colors.text, fontSize: 18, fontFamily: fonts.heavy },
  statLabel: { color: colors.textDim, fontSize: 12 },
  bio: { color: colors.text, textAlign: 'center', marginTop: space.sm, paddingHorizontal: space.lg },
});
