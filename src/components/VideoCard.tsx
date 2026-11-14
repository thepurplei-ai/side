import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Avatar, compactNumber, IconName } from '@/components/ui';
import { CLIP_COLORS } from '@/data/clipColors';
import { toVideoSource } from '@/data/clips';
import { newId, useStore, useUser } from '@/store/AppStore';
import { colors, radius, space } from '@/theme';
import type { Video } from '@/types';

const nowMs = () => Date.now();

export const REPORT_REASONS = ['Nudity or sexual content', 'Uses my face without permission', 'Violence or harm', 'Hate or bullying', 'Involves a child unsafely', 'Spam or scam', 'Something else'];

function RailButton({ icon, label, onPress, color = '#fff' }: { icon: IconName; label?: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.railButton} accessibilityRole="button" accessibilityLabel={label ?? icon}>
      <Ionicons name={icon} size={34} color={color} style={styles.shadow} />
      {label !== undefined && <Text style={styles.railText}>{label}</Text>}
    </Pressable>
  );
}

export default function VideoCard({
  video, active, height, bottomInset = 0, preload = true,
}: { video: Video; active: boolean; height: number; bottomInset?: number; preload?: boolean }) {
  const { state, dispatch } = useStore();
  const creator = useUser(video.creatorId);
  const original = state.videos.find((v) => v.id === video.remixOfId);
  const [paused, setPaused] = useState(false);
  const liked = !!state.liked[video.id];
  const saved = !!state.saved[video.id];
  const isMe = video.creatorId === state.me?.id;
  const following = !!state.following[video.creatorId];
  const commentCount = state.comments.filter((c) => c.videoId === video.id && !state.hidden[c.id]).length;

  // Videos far from the screen are not loaded, to save memory and battery.
  const player = useVideoPlayer(preload || active ? toVideoSource(video.source) : null, (p) => {
    p.loop = true;
  });

  // Feed algorithm: remember how long this video was watched each time it was on screen.
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    let duration = 6;
    const timer = setTimeout(() => {
      try {
        if (player.duration > 0) duration = player.duration;
      } catch {}
    }, 1000);
    return () => {
      clearTimeout(timer);
      dispatch({ type: 'recordView', videoId: video.id, watchedMs: Date.now() - start, durationSec: duration });
    };
  }, [active, video.id, player, dispatch]);

  // Double-tap to like, with a heart that pops up. A single tap pauses.
  const [heart] = useState(() => new Animated.Value(0));
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTap = () => {
    const now = nowMs();
    if (now - lastTap.current < 280) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (!liked) like();
      heart.setValue(0);
      Animated.sequence([
        Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 4 }),
        Animated.timing(heart, { toValue: 0, duration: 250, delay: 350, useNativeDriver: true }),
      ]).start();
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => setPaused((p) => !p), 280);
  };

  useEffect(() => {
    if (active && !paused) player.play();
    else player.pause();
  }, [active, paused, player]);

  // When you swipe away, the video starts playing again next time you see it.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setPaused(false);
  }

  const like = () => {
    if (!liked) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'toggleLike', videoId: video.id });
  };

  const share = async () => {
    try {
      const res = await Share.share({ message: `Watch "${video.title}" by @${creator?.username} on Side` });
      if (res.action === Share.sharedAction) dispatch({ type: 'share', videoId: video.id });
    } catch {}
  };

  const report = () => {
    Alert.alert('Report this video', 'Why are you reporting it? It will be hidden for you and reviewed.', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          dispatch({ type: 'report', report: { id: newId('r'), targetType: 'video', targetId: video.id, reason, createdAt: Date.now() } });
          Alert.alert('Thanks for reporting', 'We hid this video for you.');
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const more = () => {
    Alert.alert(video.title, undefined, [
      { text: saved ? 'Remove from saved' : 'Save', onPress: () => dispatch({ type: 'toggleSave', videoId: video.id }) },
      ...(isMe
        ? []
        : [{ text: 'Not interested', onPress: () => {
            dispatch({ type: 'notInterested', videoId: video.id });
            Alert.alert('Got it', 'You will see fewer videos like this.');
          } }]),
      ...(isMe ? [] : [{ text: 'Report', style: 'destructive' as const, onPress: report }]),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={{ height, backgroundColor: CLIP_COLORS[video.source.clip ?? 'fantasy'] }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} onLongPress={more}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        {video.castUri && (
          <View style={styles.cast}>
            <Image source={{ uri: video.castUri }} style={styles.castImage} />
            <Text style={styles.castText}>STARRING</Text>
          </View>
        )}
        <Animated.View
          pointerEvents="none"
          style={[styles.pausedIcon, { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }] }]}>
          <Ionicons name="heart" size={110} color={colors.primary} />
        </Animated.View>
        {paused && (
          <View style={styles.pausedIcon} pointerEvents="none">
            <Ionicons name="play" size={72} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </Pressable>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.bottomShade} pointerEvents="none" />

      <View style={[styles.rail, { bottom: bottomInset + 24 }]}>
        <Pressable onPress={() => router.push(`/user/${video.creatorId}`)} style={{ alignItems: 'center', marginBottom: 6 }}>
          <Avatar name={creator?.displayName ?? '?'} color={creator?.avatarColor ?? colors.accent} size={48} />
          {!isMe && !following && (
            <Pressable onPress={() => dispatch({ type: 'toggleFollow', userId: video.creatorId })} style={styles.followDot} hitSlop={6}>
              <Ionicons name="add" size={16} color="#fff" />
            </Pressable>
          )}
        </Pressable>
        <RailButton icon={liked ? 'heart' : 'heart-outline'} color={liked ? colors.primary : '#fff'} label={compactNumber(video.likes)} onPress={like} />
        <RailButton icon="chatbubble-ellipses" label={compactNumber(commentCount)} onPress={() => router.push(`/comments/${video.id}`)} />
        <RailButton icon={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.warning : '#fff'} label={saved ? 'Saved' : 'Save'} onPress={() => dispatch({ type: 'toggleSave', videoId: video.id })} />
        <RailButton icon="arrow-redo" label={compactNumber(video.shares)} onPress={share} />
        <RailButton icon="ellipsis-horizontal" onPress={more} />
      </View>

      <View style={[styles.info, { bottom: bottomInset + 20 }]}>
        <Pressable onPress={() => router.push(`/user/${video.creatorId}`)}>
          <Text style={styles.username}>@{creator?.username}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.prompt} numberOfLines={2}>✨ {video.prompt}</Text>
        {original && (
          <Text style={styles.remixOf} numberOfLines={1}>↻ Their version of “{original.title}”</Text>
        )}
        {video.remixAllowed && !isMe ? (
          <Pressable style={styles.remixButton} onPress={() => router.push({ pathname: '/create', params: { remixOf: video.id } })}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.remixText}>Create My Version</Text>
          </Pressable>
        ) : !video.remixAllowed ? (
          <Text style={styles.noRemix}>The creator turned off remixing for this video</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  pausedIcon: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 16 },
  railButton: { alignItems: 'center' },
  railText: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  followDot: {
    position: 'absolute', bottom: -8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  info: { position: 'absolute', left: space.md, right: 84, gap: 6 },
  username: { color: '#fff', fontWeight: '800', fontSize: 16 },
  title: { color: '#fff', fontWeight: '700', fontSize: 18 },
  prompt: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  remixOf: { color: colors.warning, fontSize: 13, fontWeight: '600' },
  remixButton: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill,
  },
  remixText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  noRemix: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  cast: { position: 'absolute', top: 70, left: space.md, alignItems: 'center', gap: 4 },
  castImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff' },
  castText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});
