import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { backdrop } from '@/theme';

/** Deep-ocean background: light from above fading into deep water. */
export default function Backdrop() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={backdrop.colors}
      locations={backdrop.locations}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
