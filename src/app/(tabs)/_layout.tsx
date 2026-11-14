import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useStore } from '@/store/AppStore';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { state } = useStore();
  const family = state.family.enabled;
  const tint = family ? colors.family : colors.text;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: '#000', borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: family ? 'Family' : 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color as string} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'compass' : 'compass-outline'} size={26} color={color as string} /> }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: () => (
            <View style={[styles.create, family && { backgroundColor: colors.family }]}>
              <Ionicons name="add" size={28} color={family ? '#04121C' : '#fff'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{ title: 'Studio', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'film' : 'film-outline'} size={24} color={color as string} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color as string} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  create: { width: 48, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
