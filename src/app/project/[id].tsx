import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, EmptyState, Label, Notice } from '@/components/ui';
import { applyInstruction, MAX_SCENES, totalDuration } from '@/ai/director';
import { generator } from '@/ai/generator';
import { toVideoSource } from '@/data/clips';
import { checkText } from '@/services/moderation';
import { Action, newId, useStore } from '@/store/AppStore';
import { colors, radius, space } from '@/theme';
import type { DirectorMessage, MediaSource, Project, Visibility } from '@/types';

function touched(p: Project): Project {
  return { ...p, updatedAt: Date.now() };
}

// Keeps track of videos being made, so leaving the screen does not stop them.
const running = new Set<string>();

async function runGeneration(project: Project, dispatch: (a: Action) => void) {
  if (running.has(project.id)) return;
  running.add(project.id);
  const base: Project = { ...project, status: 'generating', progress: 0, error: undefined, updatedAt: Date.now() };
  dispatch({ type: 'upsertProject', project: base });
  try {
    let last = 0;
    const { result } = await generator.generate(base, (f) => {
      if (f - last >= 0.05 || f === 1) {
        last = f;
        dispatch({ type: 'upsertProject', project: { ...base, progress: f } });
      }
    });
    dispatch({ type: 'upsertProject', project: { ...base, status: 'ready', progress: 1, result, updatedAt: Date.now() } });
  } catch (e) {
    dispatch({ type: 'upsertProject', project: { ...base, status: 'failed', error: e instanceof Error ? e.message : 'Something went wrong.' } });
  } finally {
    running.delete(project.id);
  }
}

function Preview({ result, castUri }: { result: MediaSource; castUri?: string }) {
  const player = useVideoPlayer(toVideoSource(result), (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.preview}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {castUri && (
        <View style={styles.cast}>
          <Image source={{ uri: castUri }} style={styles.castImage} />
          <Text style={styles.castText}>STARRING YOU</Text>
        </View>
      )}
    </View>
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const project = state.projects.find((p) => p.id === id);
  const family = !!project?.familyChildId;

  const [messages, setMessages] = useState<DirectorMessage[]>(() =>
    project
      ? [
          {
            id: 'hello',
            from: 'director',
            text: `I'm your AI Director. I planned ${project.scenes.length} scenes in ${project.style} style (about ${totalDuration(project.scenes)} seconds). Tell me what to change, for example “add a scene where I fly home”, “make it anime” or “remove scene 2”.`,
          },
        ]
      : [],
  );
  const [instruction, setInstruction] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState(project?.title ?? '');
  const [remixAllowed, setRemixAllowed] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [publishError, setPublishError] = useState('');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  if (!project) {
    return <EmptyState icon="film-outline" title="Project not found" text="It may have been deleted." action={<Button title="Go to Studio" onPress={() => router.replace('/studio')} />} />;
  }

  const busy = project.status === 'generating';
  const published = state.videos.find((v) => v.id === project.publishedVideoId);
  const update = (patch: Partial<Project>) => dispatch({ type: 'upsertProject', project: touched({ ...project, ...patch }) });

  // Any change to the plan means the video needs making again.
  const changePlan = (patch: Partial<Project>) => update({ ...patch, status: project.status === 'ready' || project.status === 'failed' ? 'draft' : project.status });

  const send = () => {
    const text = instruction.trim();
    if (!text || busy) return;
    const mod = checkText(text, { familyMode: family });
    const userMsg: DirectorMessage = { id: newId('m'), from: 'user', text };
    if (!mod.ok) {
      setMessages((m) => [...m, userMsg, { id: newId('m'), from: 'director', text: mod.reason! }]);
      setInstruction('');
      return;
    }
    const r = applyInstruction({ scenes: project.scenes, style: project.style, notes: project.notes }, text);
    if (r.changed) changePlan({ scenes: r.scenes, style: r.style, notes: r.notes });
    setMessages((m) => [...m, userMsg, { id: newId('m'), from: 'director', text: r.reply }]);
    setInstruction('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const editScene = (sceneId: string, description: string) => {
    changePlan({ scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, description } : s)) });
  };

  const finishEdit = (sceneId: string) => {
    const s = project.scenes.find((x) => x.id === sceneId);
    setEditing(null);
    if (!s) return;
    const mod = checkText(s.description, { familyMode: family });
    if (!s.description.trim() || !mod.ok) {
      Alert.alert('Scene not allowed', mod.reason ?? 'A scene needs a description.');
      editScene(sceneId, 'New scene');
    }
  };

  const removeScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return Alert.alert('A video needs at least one scene.');
    changePlan({ scenes: project.scenes.filter((s) => s.id !== sceneId) });
  };

  const addScene = () => {
    if (project.scenes.length >= MAX_SCENES) return Alert.alert(`The maximum is ${MAX_SCENES} scenes.`);
    const scene = { id: newId('sc'), description: 'New scene', durationSec: 5 };
    changePlan({ scenes: [...project.scenes, scene] });
    setEditing(scene.id);
  };

  const generate = () => {
    if (project.scenes.length === 0) return Alert.alert('Add at least one scene first.');
    for (const s of project.scenes) {
      const mod = checkText(s.description, { familyMode: family });
      if (!mod.ok) return Alert.alert('Please change a scene', mod.reason);
    }
    runGeneration(project, dispatch);
  };

  const publish = () => {
    setPublishError('');
    if (!state.me || !project.result) return;
    const title = caption.trim() || project.title;
    const mod = checkText(title);
    if (!mod.ok) return setPublishError(mod.reason!);
    const original = state.videos.find((v) => v.id === project.remixOfId);
    dispatch({
      type: 'publish',
      projectId: project.id,
      video: {
        id: newId('v'),
        creatorId: state.me.id,
        title,
        prompt: project.prompt,
        source: project.result,
        castUri: project.media?.type === 'image' ? project.media.uri : undefined,
        likes: 0,
        shares: 0,
        remixAllowed,
        remixOfId: original?.id,
        tags: [project.style.toLowerCase().replace(/\s+/g, ''), ...(original?.tags ?? [])].slice(0, 5),
        visibility,
        createdAt: Date.now(),
      },
    });
    Alert.alert('Published!', visibility === 'public' ? 'Your video is now in the feed and on your profile.' : 'Your video is on your profile.');
  };

  const remove = () =>
    Alert.alert('Delete this project?', published ? 'The published video will also be removed.' : 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (published) dispatch({ type: 'unpublish', videoId: published.id });
          dispatch({ type: 'deleteProject', projectId: project.id });
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: project.title,
          headerRight: () => (
            <Pressable onPress={remove} hitSlop={10}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Video */}
        {project.status === 'ready' && project.result ? (
          <Preview result={project.result} castUri={project.media?.type === 'image' ? project.media.uri : undefined} />
        ) : project.result && project.status === 'draft' ? (
          <View style={{ gap: space.sm }}>
            <Preview result={project.result} castUri={project.media?.type === 'image' ? project.media.uri : undefined} />
            <Notice icon="refresh" color={colors.warning} text="You changed the plan. Tap “Make my video” again to update it." />
          </View>
        ) : (
          <View style={[styles.preview, styles.placeholder]}>
            {busy ? (
              <>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
                <Text style={styles.placeholderTitle}>Making your movie… {Math.round(project.progress * 100)}%</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(project.progress * 100)}%` }]} />
                </View>
                <Body dim style={{ textAlign: 'center' }}>You can leave this screen. It keeps going.</Body>
              </>
            ) : (
              <>
                <Ionicons name="film-outline" size={40} color={colors.textDim} />
                <Text style={styles.placeholderTitle}>{project.status === 'failed' ? 'That did not work' : 'Your movie appears here'}</Text>
                {project.error && <Body dim style={{ textAlign: 'center' }}>{project.error}</Body>}
              </>
            )}
          </View>
        )}

        {generator.isPreview && project.status === 'ready' && (
          <Notice icon="flask-outline" color={colors.warning} text="Preview mode: this is a sample clip. Your scene plan below is what the real AI will film." />
        )}

        <Button
          title={busy ? 'Making…' : project.status === 'ready' ? 'Make it again' : 'Make my video'}
          icon="sparkles"
          onPress={generate}
          loading={busy}
          variant={family ? 'family' : 'primary'}
        />

        {/* Scenes */}
        <View style={styles.rowBetween}>
          <Label>Scenes · {project.style} · {totalDuration(project.scenes)}s</Label>
          {!busy && (
            <Pressable onPress={addScene} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>+ Add</Text>
            </Pressable>
          )}
        </View>
        {project.media && (
          <View style={styles.castRow}>
            {project.media.type === 'image' ? <Image source={{ uri: project.media.uri }} style={styles.castSmall} /> : <Ionicons name="videocam" size={22} color={colors.text} />}
            <Body dim>Main character: {project.media.type === 'image' ? 'your photo' : 'your video'}</Body>
          </View>
        )}
        {project.scenes.map((s, i) => (
          <Card key={s.id} style={styles.scene}>
            <Text style={styles.sceneNumber}>{i + 1}</Text>
            {editing === s.id ? (
              <TextInput
                style={[styles.sceneText, styles.sceneInput]}
                value={s.description}
                onChangeText={(t) => editScene(s.id, t)}
                onBlur={() => finishEdit(s.id)}
                autoFocus
                multiline
                maxLength={200}
              />
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => !busy && setEditing(s.id)}>
                <Text style={styles.sceneText}>{s.description}</Text>
                <Text style={styles.sceneMeta}>{s.durationSec}s · tap to edit</Text>
              </Pressable>
            )}
            {!busy && (
              <Pressable onPress={() => removeScene(s.id)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textDim} />
              </Pressable>
            )}
          </Card>
        ))}
        {project.notes.length > 0 && (
          <View style={styles.notes}>
            {project.notes.map((n) => (
              <Chip key={n} label={`✕ ${n}`} onPress={() => !busy && changePlan({ notes: project.notes.filter((x) => x !== n) })} />
            ))}
          </View>
        )}

        {/* AI Director */}
        <Label style={{ marginTop: space.md }}>AI Director</Label>
        <View style={{ gap: space.sm }}>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.from === 'user' ? styles.userBubble : styles.directorBubble]}>
              <Text style={styles.bubbleText}>{m.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={instruction}
            onChangeText={setInstruction}
            placeholder={busy ? 'Wait until the video is ready…' : 'Tell the Director what to change'}
            placeholderTextColor={colors.textDim}
            editable={!busy}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={styles.send} onPress={send} disabled={busy}>
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Publish */}
        {project.status === 'ready' && (
          <View style={{ gap: space.md, marginTop: space.lg }}>
            <Label>Share</Label>
            {family ? (
              <Notice icon="shield-checkmark" color={colors.family} text="Family stories are private and cannot be published. Watch them together on this phone." />
            ) : published ? (
              <Card style={{ gap: space.sm }}>
                <Body>✅ Published as “{published.title}” ({published.visibility}).</Body>
                <Button small title="Watch it" variant="secondary" onPress={() => router.push({ pathname: '/video/[id]', params: { id: published.id } })} />
                <Button small title="Unpublish" variant="danger" onPress={() => dispatch({ type: 'unpublish', videoId: published.id })} />
              </Card>
            ) : (
              <Card style={{ gap: space.md }}>
                <TextInput style={styles.input} value={caption} onChangeText={setCaption} placeholder="Title" placeholderTextColor={colors.textDim} maxLength={80} />
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Body>Allow “Create My Version”</Body>
                    <Body dim style={{ fontSize: 13 }}>Others can make their own version with their own photo.</Body>
                  </View>
                  <Switch value={remixAllowed} onValueChange={setRemixAllowed} trackColor={{ true: colors.primary }} />
                </View>
                <View style={styles.notes}>
                  {(['public', 'followers', 'private'] as const).map((v) => (
                    <Chip key={v} label={v === 'public' ? 'Everyone' : v === 'followers' ? 'Followers' : 'Only me'} selected={visibility === v} onPress={() => setVisibility(v)} />
                  ))}
                </View>
                {!!publishError && <Notice icon="alert-circle" color={colors.danger} text={publishError} />}
                <Button title="Publish" icon="cloud-upload-outline" onPress={publish} />
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  preview: { width: '70%', alignSelf: 'center', aspectRatio: 9 / 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  placeholderTitle: { color: colors.text, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  progressTrack: { height: 8, width: '100%', borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary },
  cast: { position: 'absolute', top: 12, left: 12, alignItems: 'center', gap: 4 },
  castImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#fff' },
  castText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  castRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  castSmall: { width: 32, height: 32, borderRadius: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  scene: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', padding: space.md },
  sceneNumber: { color: colors.primary, fontWeight: '900', fontSize: 18, width: 20 },
  sceneText: { color: colors.text, fontSize: 15, lineHeight: 21, flex: 1 },
  sceneInput: { padding: 0, borderBottomWidth: 1, borderColor: colors.primary },
  sceneMeta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  bubble: { padding: space.md, borderRadius: radius.md, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primaryDim },
  directorBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface2 },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 16, paddingHorizontal: space.md, paddingVertical: 12,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
