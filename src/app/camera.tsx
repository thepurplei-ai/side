import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useStore } from '@/store/AppStore';
import { colors, fonts, radius, space } from '@/theme';

type Mode = 'photo' | 'video';
const MAX_VIDEO_SEC = 30;

/**
 * Opens straight from the camera button in the dock.
 * Take a photo or record a video of yourself, then go on to describe your movie.
 */
export default function CameraScreen() {
  const { remixOf, template } = useLocalSearchParams<{ remixOf?: string; template?: string }>();
  const { state } = useStore();
  const family = state.family.enabled;
  const tint = family ? colors.family : colors.primary;
  const original = state.videos.find((v) => v.id === remixOf);

  const camera = useRef<React.ComponentRef<typeof CameraView>>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>('photo');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  // Ask for camera access as soon as the screen opens.
  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCam();
  }, [camPerm, requestCam]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const goToCreate = (media?: { uri: string; type: 'image' | 'video' }) => {
    // Close the camera and go back to the existing tabs (not a new copy of them).
    router.dismissTo({
      pathname: '/create',
      params: { mediaUri: media?.uri, mediaType: media?.type, remixOf, template, at: String(Date.now()) },
    });
  };

  const takePhoto = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await camera.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) goToCreate({ uri: photo.uri, type: 'image' });
    } catch (e) {
      Alert.alert('Could not take the photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!camera.current) return;
    if (!micPerm?.granted) {
      const res = await requestMic();
      if (!res.granted) return;
    }
    setSeconds(0);
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    try {
      const video = await camera.current.recordAsync({ maxDuration: MAX_VIDEO_SEC });
      if (video?.uri) goToCreate({ uri: video.uri, type: 'video' });
    } catch (e) {
      Alert.alert('Could not record the video', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setRecording(false);
    }
  };

  const stopRecording = () => camera.current?.stopRecording();

  const onShutter = () => {
    if (mode === 'photo') takePhoto();
    else if (recording) stopRecording();
    else startRecording();
  };

  const openGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 60 });
      const a = res.canceled ? undefined : res.assets?.[0];
      if (a?.uri) goToCreate({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image' });
    } catch (e) {
      Alert.alert('Could not open your photos', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  // No permission yet: explain and offer the other ways to create.
  if (!camPerm?.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Ionicons name="camera-outline" size={56} color={tint} style={{ alignSelf: 'center' }} />
        <Text style={styles.permTitle}>Star in your own movie</Text>
        <Text style={styles.permText}>Side needs the camera so you can film yourself. Photos and videos stay on your phone.</Text>
        {camPerm && !camPerm.canAskAgain ? (
          <Button title="Open settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        ) : (
          <Button title="Allow camera" icon="camera" onPress={requestCam} />
        )}
        <Button title="Pick from gallery" variant="secondary" icon="images-outline" onPress={openGallery} />
        <Button title="Write an idea instead" variant="ghost" icon="create-outline" onPress={() => goToCreate()} />
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: space.md }}>
          <Text style={styles.permText}>Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode === 'photo' ? 'picture' : 'video'}
        enableTorch={torch}
        onCameraReady={() => setReady(true)}
      />

      {/* Film-frame corners: Side's camera look. */}
      <View pointerEvents="none" style={styles.frame}>
        <View style={[styles.corner, styles.tl, { borderColor: tint }]} />
        <View style={[styles.corner, styles.tr, { borderColor: tint }]} />
        <View style={[styles.corner, styles.bl, { borderColor: tint }]} />
        <View style={[styles.corner, styles.br, { borderColor: tint }]} />
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <RoundButton icon="close" onPress={() => router.back()} label="Close camera" />
          {recording ? (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>
                0:{String(seconds).padStart(2, '0')} / 0:{MAX_VIDEO_SEC}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint} numberOfLines={2}>
              {original ? `Your version of “${original.title}”` : family ? 'Family story: film yourselves!' : 'Film yourself. You’ll be the star.'}
            </Text>
          )}
          <View style={{ gap: space.sm }}>
            <RoundButton icon="camera-reverse-outline" onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} label="Flip camera" disabled={recording} />
            <RoundButton icon={torch ? 'flash' : 'flash-off-outline'} onPress={() => setTorch((t) => !t)} label="Light" />
          </View>
        </View>

        <View style={styles.bottom}>
          {!recording && (
            <View style={styles.modes}>
              {(['photo', 'video'] as Mode[]).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.modePill, mode === m && { backgroundColor: tint }]}>
                  <Text style={[styles.modeText, mode === m && { color: colors.onPrimary }]}>{m === 'photo' ? 'Photo' : 'Video'}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.controls}>
            <SideButton icon="images" label="Gallery" onPress={openGallery} disabled={recording} />
            <Pressable
              onPress={onShutter}
              disabled={!ready || busy}
              accessibilityRole="button"
              accessibilityLabel={mode === 'photo' ? 'Take photo' : recording ? 'Stop recording' : 'Start recording'}
              style={({ pressed }) => [styles.shutterRing, { borderColor: tint, opacity: ready ? 1 : 0.5, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
              <View
                style={[
                  styles.shutter,
                  { backgroundColor: mode === 'video' ? colors.accent : tint },
                  recording && { width: 30, height: 30, borderRadius: 8 },
                ]}
              />
            </Pressable>
            <SideButton icon="create" label="Write idea" onPress={() => goToCreate()} disabled={recording} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoundButton({ icon, onPress, label, disabled }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={label} hitSlop={8} style={[styles.round, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

function SideButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.sideButton, disabled && { opacity: 0.3 }]}>
      <View style={styles.sideIcon}>
        <Ionicons name={icon} size={22} color={colors.text} />
      </View>
      <Text style={styles.sideLabel}>{label}</Text>
    </Pressable>
  );
}

const C = 34;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  frame: { ...StyleSheet.absoluteFill, margin: 18, marginTop: 110, marginBottom: 230 },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.primary },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: space.md, gap: space.md },
  hint: { flex: 1, color: colors.text, fontFamily: fonts.displayItalic, fontSize: 17, textAlign: 'center', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  round: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, marginTop: 4 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  recText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15 },
  bottom: { paddingBottom: space.lg, gap: space.lg },
  modes: { flexDirection: 'row', alignSelf: 'center', gap: 6, backgroundColor: colors.glass, padding: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder },
  modePill: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: radius.pill },
  modeText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  shutterRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  shutter: { width: 66, height: 66, borderRadius: 33 },
  sideButton: { alignItems: 'center', gap: 6, width: 80 },
  sideIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  sideLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  permission: { flex: 1, backgroundColor: colors.bg, alignItems: 'stretch', justifyContent: 'center', padding: space.lg, gap: space.md },
  permTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' },
  permText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
