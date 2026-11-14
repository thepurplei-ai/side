import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Avatar, compactNumber, IconName } from '@/components/ui';
import { CLIP_COLORS } from '@/data/clipColors';
import { posterFor, toVideoSource } from '@/data/clips';
import { newId, useStore, useUser } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';
import type { Video } from '@/types';

const nowMs = () => Date.now();

export const REPORT_REASONS = ['Nudity or sexual content', 'Uses my face without permission', 'Violence or harm', 'Hate or bullying', 'Involves a child unsafely', 'Spam or scam', 'Something else'];

function Action({ icon, label, onPress, color = colors.text }: { icon: IconName; label?: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.action} accessibilityRole="button" accessibilityLabel={label ?? icon}>
      <Ionicons name={icon} size={22} color={color} />
      {label !== undefined && <Text style={styles.actionText}>{label}</Text>}
    </Pressable>
  );
}

/** Thin coral line at the top that fills up as the video plays. */
function Progress({ player, active }: { player: ReturnType<typeof useVideoPlayer>; active: boolean }) {
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });
  let duration = 0;
  try {
    duration = player.duration;
  } catch {}
  const pct = active && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <View style={styles.progressTrack} pointerEvents="none">
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

export default function VideoCard({
  video, active, width, height, bottomInset = 0, preload = true,
}: { video: Video; active: boolean; width?: number; height: number; bottomInset?: number; preload?: boolean }) {
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
    p.timeUpdateEventInterval = 0.25;
  });

  // Feed algorithm: remember how long this video was watched each time it was on screen.
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    let duration = video.source.durationSec ?? 6;
    const timer = setTimeout(() => {
      try {
        if (player.duration > 0) duration = player.duration;
      } catch {}
    }, 1000);
    return () => {
      clearTimeout(timer);
      dispatch({ type: 'recordView', videoId: video.id, watchedMs: Date.now() - start, durationSec: duration });
    };
  }, [active, video.id, video.source.durationSec, player, dispatch]);

  // Double-tap to like, with a heart that pops up. A single tap pauses.
  const [heart] = useState(() => new Animated.Value(0));

  // Graphics: the cover picture shows at once and fades away when the first video frame is ready,
  // so there is never a black flash. The ticket panel glides in when the video comes on screen.
  const poster = posterFor(video.source);
  const isPhoto = video.source.type === 'image';
  // Wide (landscape) clips are shown whole, on a soft blurred copy of themselves.
  const wide = video.source.orientation === 'landscape';
  const [zoom] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!isPhoto) return;
    if (active) {
      zoom.setValue(0);
      const anim = Animated.timing(zoom, { toValue: 1, duration: 8000, useNativeDriver: true });
      anim.start();
      return () => anim.stop();
    }
  }, [active, isPhoto, zoom]);
  const [cover] = useState(() => new Animated.Value(1));
  const [enter] = useState(() => new Animated.Value(active ? 1 : 0));
  const loaded = preload || active;
  useEffect(() => {
    if (!loaded) cover.setValue(1);
  }, [loaded, cover]);
  useEffect(() => {
    if (active) Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    else enter.setValue(0);
  }, [active, enter]);
  const onFirstFrame = () => Animated.timing(cover, { toValue: 0, duration: 260, useNativeDriver: true }).start();
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
    <View style={{ width, height, backgroundColor: CLIP_COLORS[video.source.clip ?? 'fantasy'] }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} onLongPress={more}>
        {isPhoto ? (
          // A photo post: shown full screen with a slow, gentle zoom.
          <Animated.Image
            source={poster!}
            resizeMode={wide ? 'contain' : 'cover'}
            style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}
          />
        ) : (
          <>
            {wide && poster !== undefined && <Image source={poster} blurRadius={30} resizeMode="cover" style={StyleSheet.absoluteFill} />}
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={wide ? 'contain' : 'cover'} nativeControls={false} onFirstFrameRender={onFirstFrame} />
          </>
        )}
        {!isPhoto && poster !== undefined && !wide && (
          <Animated.Image source={poster} resizeMode="cover" pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: cover }]} />
        )}
        {video.castUri && (
          <View style={styles.cast}>
            <Image source={{ uri: video.castUri }} style={styles.castImage} />
            <Text style={styles.castText}>STARRING</Text>
          </View>
        )}
        <Animated.View
          pointerEvents="none"
          style={[styles.center, { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }] }]}>
          <Ionicons name="heart" size={110} color={colors.accent} />
        </Animated.View>
        {paused && (
          <View style={styles.center} pointerEvents="none">
            <View style={styles.pausedBadge}>
              <Ionicons name="play" size={44} color={colors.text} />
            </View>
          </View>
        )}
      </Pressable>

      {!isPhoto && <Progress player={player} active={active} />}
      <LinearGradient colors={['transparent', 'rgba(7,22,27,0.88)']} style={styles.bottomShade} pointerEvents="none" />

      {/* The "ticket": Side's info panel for every video. */}
      <Animated.View
        style={[
          styles.ticket,
          {
            bottom: bottomInset + 10,
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}>
        {/* Ticket stub sticking out of the top of the panel. */}
        {video.remixAllowed && !isMe ? (
          <Pressable style={styles.remixButton} onPress={() => router.push({ pathname: '/camera', params: { remixOf: video.id } })}>
            <Ionicons name="sparkles" size={16} color={colors.onPrimary} />
            <Text style={styles.remixText}>Create My Version</Text>
          </Pressable>
        ) : !video.remixAllowed ? (
          <View style={styles.noRemix}>
            <Ionicons name="lock-closed" size={12} color={colors.textDim} />
            <Text style={styles.noRemixText}>No remixes</Text>
          </View>
        ) : null}
        <View style={styles.creatorRow}>
          <Pressable onPress={() => router.push(`/user/${video.creatorId}`)} style={styles.creator}>
            <Avatar name={creator?.displayName ?? '?'} color={creator?.avatarColor ?? colors.accent} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.creatorName} numberOfLines={1}>{creator?.displayName}</Text>
              <Text style={styles.username} numberOfLines={1}>@{creator?.username}</Text>
            </View>
          </Pressable>
          {!isMe && (
            <Pressable
              onPress={() => dispatch({ type: 'toggleFollow', userId: video.creatorId })}
              style={[styles.followPill, following && styles.followingPill]}>
              <Text style={[styles.followText, following && { color: colors.textDim }]}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
          <Pressable onPress={more} hitSlop={10} accessibilityLabel="More options">
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textDim} />
          </Pressable>
        </View>

        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.prompt} numberOfLines={2}>“{video.prompt}”</Text>
        {original && <Text style={styles.remixOf} numberOfLines={1}>↻ Their version of “{original.title}”</Text>}

        <View style={styles.perforation} />

        <View style={styles.actions}>
          <Action icon={liked ? 'heart' : 'heart-outline'} color={liked ? colors.accent : colors.text} label={compactNumber(video.likes)} onPress={like} />
          <Action icon="chatbubble-outline" label={compactNumber(commentCount)} onPress={() => router.push(`/comments/${video.id}`)} />
          <Action icon={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.primary : colors.text} onPress={() => dispatch({ type: 'toggleSave', videoId: video.id })} />
          <Action icon="paper-plane-outline" label={compactNumber(video.shares)} onPress={share} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pausedBadge: {
    width: 84, height: 84, borderRadius: 26, backgroundColor: colors.glass, borderWidth: 1,
    borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', paddingLeft: 6,
  },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(247,240,227,0.15)' },
  progressFill: { height: 3, backgroundColor: colors.highlight },
  ticket: {
    position: 'absolute', left: 12, right: 12, padding: space.md, paddingTop: 18, paddingBottom: 12, gap: 6,
    backgroundColor: colors.glass, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.glassBorder,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  creator: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  creatorName: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15 },
  username: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12 },
  followPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primary },
  followingPill: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.glassBorder },
  followText: { color: colors.onPrimary, fontFamily: fonts.heavy, fontSize: 13 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 26, marginTop: 4 },
  prompt: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13.5, fontStyle: 'italic', lineHeight: 19 },
  remixOf: { color: colors.primary, fontSize: 13, fontFamily: fonts.bold },
  perforation: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.glassBorder, marginVertical: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  remixButton: {
    position: 'absolute', top: -20, right: 14, zIndex: 2,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary,
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.pill,
  },
  remixText: { color: colors.onPrimary, fontFamily: fonts.heavy, fontSize: 13 },
  noRemix: {
    position: 'absolute', top: -14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface2, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill,
  },
  noRemixText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12 },
  cast: { position: 'absolute', top: 110, left: space.md, alignItems: 'center', gap: 4 },
  castImage: { width: 72, height: 72, borderRadius: 22, borderWidth: 3, borderColor: colors.highlight },
  castText: { color: colors.highlight, fontSize: 10, fontFamily: fonts.heavy, letterSpacing: 1.5 },
});
