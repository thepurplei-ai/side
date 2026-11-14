import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconName } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { colors, DOCK_HEIGHT, DOCK_MARGIN, fonts, radius } from '@/theme';

const ITEMS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'albums-outline', iconActive: 'albums' },
  discover: { label: 'Discover', icon: 'planet-outline', iconActive: 'planet' },
  studio: { label: 'Studio', icon: 'film-outline', iconActive: 'film' },
  profile: { label: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
};

/** Space to leave at the bottom of a screen so the floating dock doesn't cover anything. */
export function useDockSpace(): number {
  const insets = useSafeAreaInsets();
  return DOCK_HEIGHT + DOCK_MARGIN + Math.max(insets.bottom, DOCK_MARGIN);
}

/**
 * Side's menu: a floating rounded dock with a camera shutter in the middle.
 * The shutter opens the camera straight away.
 */
export default function Dock({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useStore();
  const family = app.family.enabled;
  const tint = family ? colors.family : colors.primary;
  const routes = state.routes.filter((r) => ITEMS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderItem = (route: (typeof state.routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    const item = ITEMS[route.name];
    const label = route.name === 'index' && family ? 'Family' : item.label;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.item}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}>
        <Ionicons name={focused ? item.iconActive : item.icon} size={24} color={focused ? tint : colors.textDim} />
        <Text style={[styles.label, { color: focused ? colors.text : colors.textDim }]}>{label}</Text>
        {focused && <View style={[styles.dot, { backgroundColor: tint }]} />}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, DOCK_MARGIN) }]}>
      <View style={styles.dock}>
        {left.map(renderItem)}
        <View style={styles.item} />
        {right.map(renderItem)}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open camera to create"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/camera');
        }}
        style={({ pressed }) => [styles.shutterRing, { borderColor: tint, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
        <View style={[styles.shutter, { backgroundColor: tint }]}>
          <Ionicons name="camera" size={26} color={colors.onPrimary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: DOCK_MARGIN, right: DOCK_MARGIN, alignItems: 'center' },
  dock: {
    flexDirection: 'row', alignItems: 'center', height: DOCK_HEIGHT, width: '100%', borderRadius: radius.lg,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  label: { fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.3 },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
  shutterRing: {
    position: 'absolute', top: -20, width: 72, height: 72, borderRadius: 36, borderWidth: 3,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  shutter: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
