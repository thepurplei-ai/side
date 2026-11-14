import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { silk } from '@/theme';

/** Dark purple silk background with a soft diagonal sheen. */
export default function Silk() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={silk.colors}
      locations={silk.locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
