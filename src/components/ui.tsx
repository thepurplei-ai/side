import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, radius, space, fonts } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Avatar({ name, color, size = 40, uri }: { name: string; color: string; size?: number; uri?: string }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: color }]}>
      <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: size * 0.42 }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Button({
  title, onPress, icon, variant = 'primary', disabled, loading, style, small,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'family';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg = { primary: colors.primary, secondary: colors.surface2, ghost: 'transparent', danger: '#3B1418', family: colors.family }[variant];
  const fg = variant === 'danger' ? colors.danger : variant === 'primary' || variant === 'family' ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color = colors.primary }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({ children, style, dim }: { children: ReactNode; style?: StyleProp<TextStyle>; dim?: boolean }) {
  return <Text style={[styles.body, dim && { color: colors.textDim }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Notice({ icon = 'information-circle', text, color = colors.accent }: { icon?: IconName; text: string; color?: string }) {
  return (
    <View style={[styles.notice, { borderColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.textDim} />
      <Text style={[styles.title, { textAlign: 'center', fontSize: 20 }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textDim, textAlign: 'center' }]}>{text}</Text>
      {action}
    </View>
  );
}

export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const styles = StyleSheet.create({
  // Rounded squares instead of circles: part of Side's own look.
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.glassBorder },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.pill, minHeight: 50,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: space.md, minHeight: 36 },
  buttonText: { fontSize: 16, fontFamily: fonts.heavy, letterSpacing: 0.2 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  label: { color: colors.highlight, fontSize: 12, fontFamily: fonts.heavy, textTransform: 'uppercase', letterSpacing: 1.6 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.border },
  notice: {
    flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md,
    borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.surface,
  },
  noticeText: { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1, fontFamily: fonts.regular },
  empty: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl, flex: 1 },
});
