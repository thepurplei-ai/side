import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Insights, ProfileSort } from '@/ai/profile';
import { Avatar, Button, Chip, compactNumber } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { colors, fonts, radius, space } from '@/theme';
import type { User } from '@/types';

const LEVEL_TEXT: Record<Insights['level'], string> = {
  New: 'Just getting started',
  Rising: 'People are noticing your clips',
  Popular: 'Your clips travel far',
  Star: 'One of the top creators',
};

/** Creator insights: level, totals and engagement per clip. */
export function InsightsCard({ insights, title = 'Creator insights' }: { insights: Insights; title?: string }) {
  const stats: [string, number][] = [
    ['Likes', insights.likes],
    ['Comments', insights.comments],
    ['Shares', insights.shares],
    ['Remixes', insights.remixes],
  ];
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.level}>
          <Ionicons name="trending-up" size={14} color={colors.onPrimary} />
          <Text style={styles.levelText}>{insights.level}</Text>
        </View>
      </View>
      <Text style={styles.dim}>{LEVEL_TEXT[insights.level]}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(insights.levelProgress * 100)}%` }]} />
      </View>
      <View style={styles.statsRow}>
        {stats.map(([label, n]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statN}>{compactNumber(n)}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.dim}>
        {insights.clips === 0
          ? 'Post your first clip to see how it does.'
          : `Average engagement: ${compactNumber(insights.perClip)} per clip`}
      </Text>
    </View>
  );
}

export function KnownFor({ tags, match }: { tags: string[]; match?: number }) {
  if (tags.length === 0 && match === undefined) return null;
  return (
    <View style={styles.knownRow}>
      {match !== undefined && (
        <View style={styles.match}>
          <Ionicons name="sparkles" size={13} color={colors.lemon} />
          <Text style={styles.matchText}>{match}% match with your taste</Text>
        </View>
      )}
      {tags.map((t) => (
        <Text key={t} style={styles.tag}>#{t}</Text>
      ))}
    </View>
  );
}

const SORTS: [ProfileSort, string][] = [
  ['top', 'Top'],
  ['latest', 'Latest'],
  ['remixed', 'Most remixed'],
];

export function SortChips({ sort, onChange }: { sort: ProfileSort; onChange: (s: ProfileSort) => void }) {
  return (
    <View style={styles.sorts}>
      {SORTS.map(([s, label]) => (
        <Chip key={s} label={label} selected={sort === s} onPress={() => onChange(s)} />
      ))}
    </View>
  );
}

/** A sideways row of creators with Follow buttons. */
export function CreatorsRow({ title, users }: { title: string; users: User[] }) {
  const { state, dispatch } = useStore();
  if (users.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {users.map((u) => {
          const following = !!state.following[u.id];
          return (
            <Pressable key={u.id} style={styles.creator} onPress={() => router.push(`/user/${u.id}`)}>
              <Avatar name={u.displayName} color={u.avatarColor} size={52} />
              <Text style={styles.creatorName} numberOfLines={1}>{u.displayName}</Text>
              <Text style={styles.creatorMeta} numberOfLines={1}>{compactNumber(u.followers)} followers</Text>
              <Button small title={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'} onPress={() => dispatch({ type: 'toggleFollow', userId: u.id })} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  levelText: { color: colors.onPrimary, fontFamily: fonts.heavy, fontSize: 12 },
  dim: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.lemon },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stat: { alignItems: 'center', flex: 1 },
  statN: { color: colors.text, fontFamily: fonts.heavy, fontSize: 17 },
  statLabel: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 11.5 },
  knownRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.lemon, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  matchText: { color: colors.lemon, fontFamily: fonts.bold, fontSize: 12 },
  tag: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, backgroundColor: colors.surface2, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, overflow: 'hidden' },
  sorts: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', flexWrap: 'wrap' },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  creator: { width: 130, alignItems: 'center', gap: 4, padding: space.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  creatorName: { color: colors.text, fontFamily: fonts.heavy, fontSize: 14 },
  creatorMeta: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 11.5, marginBottom: 4 },
});
