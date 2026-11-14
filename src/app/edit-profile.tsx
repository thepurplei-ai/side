import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';

import { Button, Label, Notice } from '@/components/ui';
import { checkText } from '@/services/moderation';
import { useStore } from '@/store/AppStore';
import { colors, radius, space } from '@/theme';

export default function EditProfile() {
  const { state, dispatch } = useStore();
  const me = state.me!;
  const [displayName, setDisplayName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [error, setError] = useState('');

  const save = () => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!displayName.trim()) return setError('Please enter your name.');
    if (clean.length < 3) return setError('Usernames need at least 3 letters or numbers.');
    if (state.users.some((u) => u.id !== me.id && u.username === clean)) return setError('That username is taken.');
    const mod = checkText(`${displayName} ${clean} ${bio}`);
    if (!mod.ok) return setError(mod.reason!);
    dispatch({ type: 'updateProfile', patch: { displayName: displayName.trim(), username: clean, bio: bio.trim() } });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.sm }} keyboardShouldPersistTaps="handled">
      <Label>Name</Label>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} maxLength={40} />
      <Label>Username</Label>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={24} />
      <Label>Bio</Label>
      <TextInput style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} multiline maxLength={160} />
      {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}
      <Button title="Save" onPress={save} style={{ marginTop: space.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 16, padding: space.md },
});
