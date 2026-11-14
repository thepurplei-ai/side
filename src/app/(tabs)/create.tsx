import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { planFromPrompt, STYLES } from '@/ai/director';
import { generator } from '@/ai/generator';
import { useDockSpace } from '@/components/Dock';
import Silk from '@/components/Silk';
import { Body, Button, Chip, Label, Notice, Title } from '@/components/ui';
import { TEMPLATES } from '@/data/seed';
import { importMedia } from '@/services/media';
import { MAX_VIDEO_SEC, tagsFromCaption, titleFromCaption } from '@/services/mediaRules';
import { checkText } from '@/services/moderation';
import { newId, useStore, useUser } from '@/store/AppStore';
import { colors, fonts, radius, space } from '@/theme';
import type { ImportedMedia, Project, Visibility } from '@/types';

type Mode = 'post' | 'ai';

const IDEAS = [
  'I am a superhero saving someone in New York',
  'I am an astronaut exploring Mars',
  'A magical Christmas adventure with Santa',
  'I am the hero of a fantasy world',
];

/** Small looping preview of the chosen photo or video. */
function MediaPreview({ media }: { media: ImportedMedia }) {
  const player = useVideoPlayer(media.type === 'video' ? { uri: media.uri } : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={styles.preview}>
      {media.type === 'video' ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View style={styles.previewBadge}>
        <Ionicons name={media.type === 'video' ? 'videocam' : 'image'} size={12} color={colors.text} />
        <Text style={styles.previewBadgeText}>{media.type === 'video' ? `${Math.round(media.durationSec ?? 0)}s` : 'Photo'}</Text>
      </View>
    </View>
  );
}

export default function Create() {
  const dockSpace = useDockSpace();
  const { state, dispatch } = useStore();
  const params = useLocalSearchParams<{ remixOf?: string; template?: string; fresh?: string }>();
  const family = state.family.enabled;

  // The camera hands its photo/video over through the app memory (state.draft).
  const draft = state.draft;
  const remixOf = params.remixOf ?? draft?.remixOf;
  const templateId = params.template ?? draft?.template;
  const original = state.videos.find((v) => v.id === remixOf);
  const originalCreator = useUser(original?.creatorId);
  const template = TEMPLATES.find((t) => t.id === templateId);

  const [media, setMedia] = useState<ImportedMedia | undefined>();
  const [mode, setMode] = useState<Mode>('ai');
  const [consent, setConsent] = useState(false);
  const [caption, setCaption] = useState('');
  const [remixAllowed, setRemixAllowed] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState<string>('Cinematic');
  const [childId, setChildId] = useState<string>('family');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fill the form when opened from "Create My Version" or a template; "Your own idea" opens blank.
  const formKey = `${original?.id ?? ''}|${template?.id ?? ''}|${params.fresh ?? ''}`;
  const [appliedKey, setAppliedKey] = useState('');
  if (formKey !== appliedKey) {
    setAppliedKey(formKey);
    if (params.fresh && !original && !template) {
      setMedia(undefined);
      setCaption('');
      setIdea('');
      setStyle('Cinematic');
      setConsent(false);
      setMode('ai');
    }
    if (original) {
      setIdea(original.prompt);
      setStyle('Cinematic');
      setMode('ai');
    } else if (template) {
      setIdea(template.prompt);
      setStyle(template.style);
      setMode('ai');
    }
    setError('');
  }

  // A new photo/video from the camera: show it and offer to post it.
  const [appliedDraft, setAppliedDraft] = useState('');
  if (draft && draft.id !== appliedDraft) {
    setAppliedDraft(draft.id);
    setMedia(draft.media);
    setConsent(false);
    setMode(draft.remixOf || draft.template || family ? 'ai' : 'post');
    setError('');
  }

  const remixBlocked = !!original && !original.remixAllowed;
  const canPost = !family && !original && !template;

  const openCamera = () => router.push({ pathname: '/camera', params: { remixOf, template: templateId } });

  // Pick from the phone: the system photo picker needs no permission.
  const pickFromGallery = async () => {
    setError('');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
        videoMaxDuration: MAX_VIDEO_SEC,
        allowsMultipleSelection: false,
      });
      const a = res.canceled ? undefined : res.assets?.[0];
      if (!a?.uri) return;
      setBusy(true);
      const imported = await importMedia({
        uri: a.uri,
        type: a.type === 'video' ? 'video' : 'image',
        duration: a.duration,
        fileSize: a.fileSize,
        width: a.width,
        height: a.height,
        mimeType: a.mimeType,
      });
      setMedia(imported);
      setConsent(false);
      if (canPost) setMode('post');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that photo or video. Please try another one.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMedia(undefined);
    setConsent(false);
    setCaption('');
    setIdea('');
    setStyle('Cinematic');
    setMode('ai');
    setError('');
    dispatch({ type: 'setDraft', draft: undefined });
    router.setParams({ remixOf: undefined, template: undefined, fresh: undefined });
  };

  // Post your own photo/video as a clip, as it is.
  const post = () => {
    if (!media || !state.me) return;
    const text = caption.trim();
    const mod = checkText(text);
    if (!mod.ok) return setError(mod.reason!);
    if (!consent) return setError('Please confirm the people in your clip are you, or that they agreed to be in it.');
    const video = {
      id: newId('v'),
      creatorId: state.me.id,
      title: titleFromCaption(text) || (media.type === 'video' ? 'My clip' : 'My photo'),
      prompt: text,
      source: { uri: media.uri, type: media.type, posterUri: media.posterUri, orientation: media.orientation, durationSec: media.durationSec },
      castUri: undefined,
      likes: 0,
      shares: 0,
      remixAllowed,
      tags: tagsFromCaption(text),
      visibility,
      createdAt: Date.now(),
    };
    dispatch({ type: 'publish', video, projectId: '' });
    reset();
    router.push({ pathname: '/video/[id]', params: { id: video.id, list: `user:${state.me.id}` } });
  };

  // Plan an AI clip with the AI Director.
  const startAi = () => {
    if (remixBlocked) return;
    const text = idea.trim();
    if (text.length < 5) return setError('Describe your clip in a few words first.');
    const mod = checkText(text, { familyMode: family });
    if (!mod.ok) return setError(mod.reason!);
    if (media && !consent) return setError('Please confirm the person in your photo or video is you, or that you have their permission.');
    const plan = planFromPrompt(text, style);
    const now = Date.now();
    const project: Project = {
      id: newId('p'),
      title: original ? `My version: ${original.title}` : template?.title ?? text.split(/[.!?\n]/)[0].slice(0, 48),
      prompt: text,
      style: plan.style,
      notes: plan.notes,
      scenes: plan.scenes,
      media: media ? { uri: media.uri, type: media.type } : undefined,
      consentConfirmed: !!media && consent,
      remixOfId: original?.id,
      templateId: template?.id,
      familyChildId: family ? childId : undefined,
      status: 'draft',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'upsertProject', project });
    reset();
    router.push(`/project/${project.id}`);
  };

  const tags = tagsFromCaption(caption);
  const title = original ? 'Create My Version' : family ? 'New family story' : template ? 'Create' : media && mode === 'post' ? 'New clip' : 'Your own idea';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Silk />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: dockSpace + space.lg }]} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Title>{title}</Title>
            {(original || template || idea || media || caption) && (
              <Pressable onPress={reset} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            )}
          </View>

          {original && (
            <View style={styles.remixCard}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.remixTitle}>“{original.title}”</Text>
                <Text style={styles.remixMeta}>Original by @{originalCreator?.username}. They will be credited.</Text>
              </View>
            </View>
          )}
          {remixBlocked && <Notice icon="lock-closed" color={colors.danger} text="The creator of this clip does not allow remixes." />}
          {template && <Notice icon="sparkles" text={`Template: ${template.title}. Add your photo to star in it.`} />}

          {/* 1. Photo or video */}
          <Label>{media ? 'Your photo or video' : '1 · Add a photo or video'}</Label>
          {media ? (
            <View style={styles.mediaRow}>
              <MediaPreview media={media} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Button small title="Retake" variant="secondary" icon="camera-outline" onPress={openCamera} />
                <Button small title="Choose another" variant="secondary" icon="images-outline" onPress={pickFromGallery} />
                <Button small title="Remove" variant="ghost" icon="trash-outline" onPress={() => { setMedia(undefined); setMode('ai'); setConsent(false); }} />
              </View>
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <MediaButton icon="camera" label="Camera" onPress={openCamera} />
              <MediaButton icon="images" label={busy ? 'Adding…' : 'Upload'} onPress={pickFromGallery} disabled={busy} />
            </View>
          )}
          {busy && <ActivityIndicator color={colors.primary} />}

          {/* What to do with it */}
          {media && canPost && (
            <View style={styles.modeSwitch}>
              {(['post', 'ai'] as Mode[]).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
                  <Ionicons name={m === 'post' ? 'paper-plane' : 'sparkles'} size={16} color={mode === m ? colors.onPrimary : colors.textDim} />
                  <Text style={[styles.modeText, mode === m && { color: colors.onPrimary }]}>{m === 'post' ? 'Post as it is' : 'Transform with AI'}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {media && (
            <Pressable style={styles.consent} onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
              <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={24} color={consent ? colors.primary : colors.textDim} />
              <Text style={styles.consentText}>
                {family ? 'This is me or my own child, and I am their parent or guardian.' : 'Everyone in this photo or video is me, or agreed to be in it.'}
              </Text>
            </Pressable>
          )}

          {media && mode === 'post' && canPost ? (
            <>
              <Label style={{ marginTop: space.sm }}>2 · Caption</Label>
              <TextInput
                style={styles.input}
                value={caption}
                onChangeText={setCaption}
                multiline
                placeholder="Say something about your clip… add #tags"
                placeholderTextColor={colors.textDim}
                maxLength={300}
              />
              {tags.length > 0 && (
                <View style={styles.chips}>
                  {tags.map((t) => (
                    <Text key={t} style={styles.tag}>#{t}</Text>
                  ))}
                </View>
              )}
              <Label style={{ marginTop: space.sm }}>3 · Who can see it</Label>
              <View style={styles.chips}>
                {(['public', 'followers', 'private'] as const).map((v) => (
                  <Chip key={v} label={v === 'public' ? 'Everyone' : v === 'followers' ? 'Followers' : 'Only me'} selected={visibility === v} onPress={() => setVisibility(v)} />
                ))}
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Body>Allow “Create My Version”</Body>
                  <Body dim style={{ fontSize: 13 }}>Others can make their own version with their own photo.</Body>
                </View>
                <Switch value={remixAllowed} onValueChange={setRemixAllowed} trackColor={{ true: colors.primary }} />
              </View>
              {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}
              <Button title="Post clip" icon="paper-plane" onPress={post} style={{ marginTop: space.sm }} />
            </>
          ) : (
            <>
              {family && (
                <View style={{ gap: space.sm }}>
                  <Label>Who is this story for?</Label>
                  <View style={styles.chips}>
                    <Chip label="Whole family" selected={childId === 'family'} onPress={() => setChildId('family')} color={colors.family} />
                    {state.family.children.map((c) => (
                      <Chip key={c.id} label={c.name} selected={childId === c.id} onPress={() => setChildId(c.id)} color={colors.family} />
                    ))}
                  </View>
                </View>
              )}
              {generator.isPreview && (
                <Notice
                  icon="flask-outline"
                  color={colors.warning}
                  text="Preview mode: the AI Director plans your clip, and a sample clip stands in for the final video until the AI video service is connected."
                />
              )}
              <Label style={{ marginTop: space.sm }}>{media ? '2 · Describe the AI clip' : '2 · Describe your clip'}</Label>
              <TextInput
                style={styles.input}
                value={idea}
                onChangeText={setIdea}
                multiline
                placeholder="I am a superhero flying over New York. Then I rescue a cat from a rooftop."
                placeholderTextColor={colors.textDim}
                maxLength={600}
              />
              <Body dim style={{ fontSize: 13 }}>Tip: use “then” to make several scenes.</Body>
              {!idea && (
                <View style={styles.chips}>
                  {IDEAS.map((i) => (
                    <Chip key={i} label={i} onPress={() => setIdea(i)} />
                  ))}
                </View>
              )}
              <Label style={{ marginTop: space.sm }}>3 · Style</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {STYLES.map((s) => (
                  <Chip key={s} label={s} selected={style === s} onPress={() => setStyle(s)} />
                ))}
              </ScrollView>
              {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}
              <Button
                title="Plan my clip with the AI Director"
                icon="sparkles"
                onPress={startAi}
                disabled={remixBlocked}
                variant={family ? 'family' : 'primary'}
                style={{ marginTop: space.sm }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MediaButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.mediaButton, (pressed || disabled) && { opacity: 0.6 }]} onPress={onPress}>
      <Ionicons name={icon} size={30} color={colors.text} />
      <Text style={styles.mediaLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { color: colors.textDim, fontFamily: fonts.bold },
  remixCard: {
    flexDirection: 'row', gap: space.sm, alignItems: 'center', padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary,
  },
  remixTitle: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  remixMeta: { color: colors.textDim, fontSize: 13, fontFamily: fonts.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { color: colors.lemon, fontFamily: fonts.bold, fontSize: 13 },
  mediaButtons: { flexDirection: 'row', gap: space.sm },
  mediaButton: {
    flex: 1, height: 120, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5,
    borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  mediaLabel: { color: colors.text, fontFamily: fonts.bold },
  mediaRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  preview: { width: 120, aspectRatio: 9 / 16, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
  previewBadge: {
    position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.glass, paddingVertical: 3, paddingHorizontal: 7, borderRadius: radius.pill,
  },
  previewBadgeText: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill },
  modeButtonActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textDim, fontFamily: fonts.heavy, fontSize: 14 },
  consent: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  consentText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  input: {
    minHeight: 100, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 16, padding: space.md, textAlignVertical: 'top', fontFamily: fonts.regular,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
