import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openOwnIdea } from '@/components/OwnIdeaCard';
import { IconName } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { colors, DOCK_HEIGHT, DOCK_MARGIN, fonts, radius } from '@/theme';

const ITEMS: Record<string, { label: string; hint: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', hint: 'Clips for you', icon: 'albums-outline', iconActive: 'albums' },
  discover: { label: 'Discover', hint: 'Search, templates, creators', icon: 'planet-outline', iconActive: 'planet' },
  studio: { label: 'Studio', hint: 'Your projects and drafts', icon: 'film-outline', iconActive: 'film' },
  profile: { label: 'Profile', hint: 'Your clips and settings', icon: 'person-circle-outline', iconActive: 'person-circle' },
};

/** Space to leave at the bottom of a screen so the floating buttons don't cover anything. */
export function useDockSpace(): number {
  const insets = useSafeAreaInsets();
  return DOCK_HEIGHT + DOCK_MARGIN + Math.max(insets.bottom, DOCK_MARGIN);
}

/**
 * side.'s bottom: no menu bar. A big round camera button in the centre (opens the camera at once)
 * and a round menu button in the corner that opens the menu (Home, Discover, Studio, Profile).
 */
export default function Dock({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useStore();
  const [open, setOpen] = useState(false);
  const family = app.family.enabled;
  const tint = family ? colors.family : colors.primary;
  const routes = state.routes.filter((r) => ITEMS[r.name]);
  const current = state.routes[state.index]?.name;
  const bottom = Math.max(insets.bottom, DOCK_MARGIN);

  const go = (key: string) => {
    setOpen(false);
    navigateToTab(key);
  };

  return (
    <>
      <View pointerEvents="box-none" style={[styles.bar, { bottom }]}>
        <View style={styles.side} />
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
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setOpen(true);
            }}
            style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.7 }]}>
            <Ionicons name={current && ITEMS[current] ? ITEMS[current].iconActive : 'menu'} size={20} color={colors.text} />
            <Ionicons name="menu" size={16} color={colors.textDim} />
          </Pressable>
        </View>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close menu" />
        <View style={[styles.sheet, { bottom: bottom + DOCK_HEIGHT + 8 }]}>
          {routes.map((route) => {
            const item = ITEMS[route.name];
            const focused = current === route.name;
            const label = route.name === 'index' && family ? 'Family' : item.label;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: focused }}
                onPress={() => go(route.key)}
                style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && { opacity: 0.75 }]}>
                <Ionicons name={focused ? item.iconActive : item.icon} size={22} color={focused ? colors.onPrimary : colors.text} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, focused && { color: colors.onPrimary }]}>{label}</Text>
                  <Text style={[styles.itemHint, focused && { color: colors.onPrimary, opacity: 0.7 }]}>{item.hint}</Text>
                </View>
                {focused && <View style={styles.dot} />}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setOpen(false);
              openOwnIdea();
            }}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.75 }]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>Your own idea</Text>
              <Text style={styles.itemHint}>Start a clip from a blank page</Text>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: DOCK_MARGIN, right: DOCK_MARGIN, height: DOCK_HEIGHT,
    flexDirection: 'row', alignItems: 'center',
  },
  side: { flex: 1 },
  shutterRing: {
    width: DOCK_HEIGHT, height: DOCK_HEIGHT, borderRadius: DOCK_HEIGHT / 2, borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  shutter: { width: DOCK_HEIGHT - 16, height: DOCK_HEIGHT - 16, borderRadius: (DOCK_HEIGHT - 16) / 2, alignItems: 'center', justifyContent: 'center' },
  menuButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 14, borderRadius: radius.pill,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder,
  },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', right: DOCK_MARGIN, left: DOCK_MARGIN, padding: 8, gap: 4, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  itemActive: { backgroundColor: colors.primary },
  itemLabel: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  itemHint: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.highlight },
});
