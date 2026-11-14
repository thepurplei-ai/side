import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDockSpace } from '@/components/Dock';
import { Body, Button, Chip, Label, Notice, Title } from '@/components/ui';
import { planFromPrompt, STYLES } from '@/ai/director';
import { generator } from '@/ai/generator';
import { TEMPLATES } from '@/data/seed';
import { checkText } from '@/services/moderation';
import { newId, useStore, useUser } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';
import type { Project } from '@/types';

type Media = { uri: string; type: 'image' | 'video' };

const IDEAS = [
  'I am a superhero saving someone in New York',
  'I am an astronaut exploring Mars',
  'A magical Christmas adventure with Santa',
  'I am the main character of a fantasy movie',
];

export default function Create() {
  const dockSpace = useDockSpace();
  const { state, dispatch } = useStore();
  const params = useLocalSearchParams<{ remixOf?: string; template?: string; mediaUri?: string; mediaType?: string; at?: string }>();
  const family = state.family.enabled;

  const original = state.videos.find((v) => v.id === params.remixOf);
  const originalCreator = useUser(original?.creatorId);
  const template = TEMPLATES.find((t) => t.id === params.template);

  const [media, setMedia] = useState<Media | undefined>();
  const [consent, setConsent] = useState(false);
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState<string>('Cinematic');
  const [childId, setChildId] = useState<string>('family');
  const [error, setError] = useState('');

  // Fill the form when opened from "Create My Version" or a template.
  const formKey = `${original?.id ?? ''}|${template?.id ?? ''}`;
  const [appliedKey, setAppliedKey] = useState('|');
  if (formKey !== appliedKey) {
    setAppliedKey(formKey);
    if (original) {
      setIdea(original.prompt);
      setStyle('Cinematic');
    } else if (template) {
      setIdea(template.prompt);
      setStyle(template.style);
    }
    setError('');
  }

  // A photo or video just taken with the Side camera.
  const mediaKey = params.mediaUri ? `${params.mediaUri}|${params.at ?? ''}` : '';
  const [appliedMedia, setAppliedMedia] = useState('');
  if (mediaKey && mediaKey !== appliedMedia) {
    setAppliedMedia(mediaKey);
    setMedia({ uri: params.mediaUri!, type: params.mediaType === 'video' ? 'video' : 'image' });
    setConsent(false);
  }

  const openCamera = () => router.push({ pathname: '/camera', params: { remixOf: params.remixOf, template: params.template } });

  const remixBlocked = !!original && !original.remixAllowed;

  const pick = async (source: 'camera-photo' | 'camera-video' | 'library') => {
    setError('');
    try {
      if (source === 'library') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Allow access to your photos to upload one.');
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 60 });
        if (!res.canceled && res.assets[0]) {
          const a = res.assets[0];
          setMedia({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image' });
          setConsent(false);
        }
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Allow camera access to take a photo or video.');
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: source === 'camera-video' ? ['videos'] : ['images'],
          quality: 0.8,
          videoMaxDuration: 30,
          cameraType: ImagePicker.CameraType.front,
        });
        if (!res.canceled && res.assets[0]) {
          setMedia({ uri: res.assets[0].uri, type: source === 'camera-video' ? 'video' : 'image' });
          setConsent(false);
        }
      }
    } catch {
      setError('Could not open the camera or photos. Please try again.');
    }
  };

  const reset = () => {
    setMedia(undefined);
    setConsent(false);
    setIdea('');
    setStyle('Cinematic');
    setError('');
    router.setParams({ remixOf: undefined, template: undefined, mediaUri: undefined, mediaType: undefined, at: undefined });
  };

  const start = () => {
    if (remixBlocked) return;
    const text = idea.trim();
    if (text.length < 5) return setError('Describe your video in a few words first.');
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
      media,
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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: dockSpace + space.lg }]} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Title>{original ? 'Create My Version' : family ? 'New family story' : 'Create'}</Title>
            {(original || template || idea) && (
              <Pressable onPress={reset} hitSlop={8}>
                <Text style={{ color: colors.textDim, fontFamily: fonts.bold }}>Clear</Text>
              </Pressable>
            )}
          </View>

          {generator.isPreview && (
            <Notice
              icon="flask-outline"
              color={colors.warning}
              text="Preview mode: the AI Director plans your movie, and a sample clip stands in for the final video until the AI video service is connected."
            />
          )}

          {original && (
            <View style={styles.remixCard}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.remixTitle}>“{original.title}”</Text>
                <Text style={styles.remixMeta}>Original by @{originalCreator?.username}. They will be credited.</Text>
              </View>
            </View>
          )}
          {remixBlocked && <Notice icon="lock-closed" color={colors.danger} text="The creator of this video does not allow remixes." />}
          {template && <Notice icon="sparkles" text={`Template: ${template.title}. Add your photo to star in it.`} />}

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

          <Label>1 · Star in it (optional)</Label>
          {media ? (
            <View style={styles.mediaRow}>
              {media.type === 'image' ? (
                <Image source={{ uri: media.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.videoThumb]}>
                  <Ionicons name="videocam" size={32} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1, gap: space.sm }}>
                <Body>{media.type === 'image' ? 'Photo added' : 'Video added'}</Body>
                <Button small title="Remove" variant="ghost" icon="trash-outline" onPress={() => { setMedia(undefined); setConsent(false); }} />
              </View>
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <MediaButton icon="camera" label="Side camera" onPress={openCamera} />
              <MediaButton icon="images" label="Upload" onPress={() => pick('library')} />
            </View>
          )}
          {media && (
            <Pressable style={styles.consent} onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
              <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={24} color={consent ? colors.primary : colors.textDim} />
              <Text style={styles.consentText}>
                {family
                  ? 'This is me or my own child, and I am their parent or guardian.'
                  : 'This is me, or I have permission from everyone shown to use their face.'}
              </Text>
            </Pressable>
          )}
          {original && <Body dim style={{ fontSize: 13 }}>Your photo becomes the main character. The original creator’s face is never copied into your version.</Body>}

          <Label style={{ marginTop: space.sm }}>2 · Describe your movie</Label>
          <TextInput
            style={styles.ideaInput}
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
              {IDEAS.filter((i) => !family || !/superhero/.test(i)).map((i) => (
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
            title="Plan my movie with the AI Director"
            icon="sparkles"
            onPress={start}
            disabled={remixBlocked}
            variant={family ? 'family' : 'primary'}
            style={{ marginTop: space.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MediaButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.mediaButton, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <Ionicons name={icon} size={28} color={colors.text} />
      <Text style={styles.mediaLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remixCard: {
    flexDirection: 'row', gap: space.sm, alignItems: 'center', padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary,
  },
  remixTitle: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  remixMeta: { color: colors.textDim, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  mediaButtons: { flexDirection: 'row', gap: space.sm },
  mediaButton: {
    flex: 1, aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  mediaLabel: { color: colors.text, fontFamily: fonts.bold },
  mediaRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: { width: 90, height: 120, borderRadius: radius.md, backgroundColor: colors.surface2 },
  videoThumb: { alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  consentText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20 },
  ideaInput: {
    minHeight: 110, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 16, padding: space.md, textAlignVertical: 'top',
  },
});
