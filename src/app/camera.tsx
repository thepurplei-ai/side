import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { importMedia, type RawMedia } from '@/services/media';
import { MAX_VIDEO_SEC } from '@/services/mediaRules';
import { newId, useStore } from '@/store/AppStore';
import { colors, fonts, radius, space } from '@/theme';

type Mode = 'photo' | 'video';

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * Opens straight from the camera button in the dock.
 * Take a photo or record a video of yourself, then go on to describe your clip.
 */
export default function CameraScreen() {
  const { remixOf, template } = useLocalSearchParams<{ remixOf?: string; template?: string }>();
  const { state, dispatch } = useStore();
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
  /** What was just taken, shown full screen with "Retake" / "Use it". */
  const [captured, setCaptured] = useState<RawMedia | undefined>();
  const recordStart = useRef(0);

  // Ask for camera access as soon as the screen opens.
  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCam();
  }, [camPerm, requestCam]);

  // Some phones don't report "ready" again after switching camera or mode: allow it after a moment anyway.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [ready, mode, facing]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Hand the photo/video to the Create screen through the app memory, then close the camera.
  // (Passing it in the link was unreliable on some phones.)
  const goToCreate = async (raw?: RawMedia) => {
    if (raw) {
      setBusy(true);
      try {
        const media = await importMedia(raw);
        dispatch({ type: 'setDraft', draft: { id: newId('d'), media, remixOf, template } });
      } catch (e) {
        setBusy(false);
        Alert.alert('Could not use this', e instanceof Error ? e.message : 'Please try again.');
        return;
      }
      setBusy(false);
    }
    router.dismissTo({ pathname: '/create', params: { remixOf, template, fresh: raw ? undefined : String(Date.now()) } });
  };

  const switchMode = (m: Mode) => {
    if (m === mode || recording) return;
    setReady(false); // the camera restarts in the new mode; wait until it says it's ready
    setMode(m);
  };

  const flip = () => {
    if (recording) return;
    setReady(false);
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  };

  const takePhoto = async () => {
    if (!camera.current || busy || !ready) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const photo = await camera.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (photo?.uri) setCaptured({ uri: photo.uri, type: 'image', width: photo.width, height: photo.height });
    } catch (e) {
      Alert.alert('Could not take the photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!camera.current || !ready) return;
    if (!micPerm?.granted) {
      const res = await requestMic();
      if (!res.granted) {
        Alert.alert('Microphone needed', 'Allow the microphone to record videos with sound.');
        return;
      }
    }
    setSeconds(0);
    setRecording(true);
    recordStart.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    try {
      const video = await camera.current.recordAsync({ maxDuration: MAX_VIDEO_SEC });
      const durationSec = (Date.now() - recordStart.current) / 1000;
      if (video?.uri) setCaptured({ uri: video.uri, type: 'video', duration: durationSec });
    } catch (e) {
      Alert.alert('Could not record the video', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setRecording(false);
    }
  };

  // Stopping in the first second makes some phones fail to save the video, so wait a moment.
  const stopRecording = () => {
    if (Date.now() - recordStart.current < 1200) return;
    camera.current?.stopRecording();
  };

  const onShutter = () => {
    if (mode === 'photo') takePhoto();
    else if (recording) stopRecording();
    else startRecording();
  };

  const openGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: MAX_VIDEO_SEC });
      const a = res.canceled ? undefined : res.assets?.[0];
      if (a?.uri) {
        await goToCreate({
          uri: a.uri, type: a.type === 'video' ? 'video' : 'image', duration: a.duration, fileSize: a.fileSize,
          width: a.width, height: a.height, mimeType: a.mimeType,
        });
      }
    } catch (e) {
      Alert.alert('Could not open your photos', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  // Just took something: show it full screen first.
  if (captured) {
    return <CapturePreview media={captured} busy={busy} onRetake={() => setCaptured(undefined)} onUse={() => goToCreate(captured)} tint={tint} />;
  }

  // No permission yet: explain and offer the other ways to create.
  if (!camPerm?.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Ionicons name="camera-outline" size={56} color={tint} style={{ alignSelf: 'center' }} />
        <Text style={styles.permTitle}>Star in your own clip</Text>
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
                {clock(seconds)} / {clock(MAX_VIDEO_SEC)}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint} numberOfLines={2}>
              {original ? `Your version of “${original.title}”` : family ? 'Family story: film yourselves!' : 'Film yourself. You’ll be the star.'}
            </Text>
          )}
          <View style={{ gap: space.sm }}>
            <RoundButton icon="camera-reverse-outline" onPress={flip} label="Flip camera" disabled={recording} />
            <RoundButton icon={torch ? 'flash' : 'flash-off-outline'} onPress={() => setTorch((t) => !t)} label="Light" />
          </View>
        </View>

        <View style={styles.bottom}>
          {!recording && (
            <View style={styles.modes}>
              {(['photo', 'video'] as Mode[]).map((m) => (
                <Pressable key={m} onPress={() => switchMode(m)} style={[styles.modePill, mode === m && { backgroundColor: tint }]}>
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

/** Full-screen look at the photo/video you just took, with "Retake" and "Use it". */
function CapturePreview({ media, busy, onRetake, onUse, tint }: { media: RawMedia; busy: boolean; onRetake: () => void; onUse: () => void; tint: string }) {
  const player = useVideoPlayer(media.type === 'video' ? { uri: media.uri } : null, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.container}>
      {media.type === 'video' ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Text style={styles.hint}>{media.type === 'video' ? 'Your video' : 'Your photo'}</Text>
        </View>
        <View style={styles.previewActions}>
          <Button title="Retake" variant="secondary" icon="refresh" onPress={onRetake} style={{ flex: 1 }} disabled={busy} />
          <Pressable onPress={onUse} disabled={busy} style={[styles.useButton, { backgroundColor: tint }]}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.useText}>Use it</Text>}
          </Pressable>
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
  previewActions: { flexDirection: 'row', gap: space.md, padding: space.lg, alignItems: 'center' },
  useButton: { flex: 1, minHeight: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  useText: { color: colors.onPrimary, fontFamily: fonts.heavy, fontSize: 16 },
  permission: { flex: 1, backgroundColor: colors.bg, alignItems: 'stretch', justifyContent: 'center', padding: space.lg, gap: space.md },
  permTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' },
  permText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
