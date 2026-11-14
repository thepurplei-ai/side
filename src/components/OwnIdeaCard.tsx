import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

/** Opens a blank Create form: any idea, for your own account. */
export function openOwnIdea() {
  router.push({ pathname: '/create', params: { fresh: String(Date.now()) } });
}

/** A plain card with a "+": "Your own idea". */
export default function OwnIdeaCard({ style, compact }: { style?: StyleProp<ViewStyle>; compact?: boolean }) {
  return (
    <Pressable
      onPress={openOwnIdea}
      accessibilityRole="button"
      accessibilityLabel="Create your own idea"
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && { opacity: 0.75 }, style]}>
      <Ionicons name="add" size={compact ? 28 : 34} color={colors.text} />
      <Text style={styles.title}>Your own idea</Text>
      {!compact && <Text style={styles.text}>Start blank. Any clip you want, for your account.</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.textDim,
    backgroundColor: 'rgba(247,240,227,0.04)', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14,
  },
  compact: { padding: 8, gap: 4 },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15, textAlign: 'center' },
  text: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5, textAlign: 'center', lineHeight: 17 },
});
