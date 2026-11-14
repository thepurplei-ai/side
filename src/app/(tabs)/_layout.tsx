import { Tabs } from 'expo-router';

import Dock from '@/components/Dock';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      {/* The Create form opens from the camera ("Write an idea") or from templates; it has no dock button. */}
      <Tabs.Screen name="create" />
      <Tabs.Screen name="studio" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
