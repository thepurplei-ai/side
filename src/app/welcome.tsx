import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Label, Notice } from '@/components/ui';
import { checkText } from '@/services/moderation';
import { newId, useStore } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';

const AVATAR_COLORS = ['#FF3D7F', '#8B5CF6', '#38BDF8', '#F59E0B', '#34D399', '#F87171'];

export default function Welcome() {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const year = Number(birthYear);
  const thisYear = new Date().getFullYear();
  const validYear = birthYear.length === 4 && year > 1900 && year <= thisYear;
  // People born this many years ago may not have had their birthday yet, so require one more year.
  const isAdult = validYear && thisYear - year > 18;
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

  const submit = () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (cleanUsername.length < 3) return setError('Usernames need at least 3 letters or numbers.');
    if (!validYear) return setError('Please enter your birth year, for example 1995.');
    if (!isAdult) {
      return setError(
        'Side is for adults aged 18 and over. Children can enjoy stories with a parent through Family Mode on the parent’s account.',
      );
    }
    if (!agreed) return setError('Please agree to the community rules.');
    const mod = checkText(`${name} ${cleanUsername}`);
    if (!mod.ok) return setError(mod.reason!);
    dispatch({
      type: 'signUp',
      user: {
        id: newId('u'),
        displayName: name.trim(),
        username: cleanUsername,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        bio: '',
        followers: 0,
      },
    });
  };

  return (
    <LinearGradient colors={['#221B4A', colors.bg, colors.bg]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.logoRow}>
              <View style={styles.logo}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <Text style={styles.brand}>Side</Text>
            </View>
            <Text style={styles.headline}>Be the main character.</Text>
            <Body dim>
              Turn your photos, videos and ideas into AI movies. Watch what others make, then tap “Create My Version”
              to star in it yourself.
            </Body>

            <View style={{ gap: space.sm, marginTop: space.lg }}>
              <Label>Your name</Label>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Alex" placeholderTextColor={colors.textDim} maxLength={40} />
              <Label style={{ marginTop: space.sm }}>Username</Label>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="alex.makes.movies"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
              />
              {username.length > 0 && <Text style={styles.hint}>@{cleanUsername}</Text>}
              <Label style={{ marginTop: space.sm }}>Birth year</Label>
              <TextInput
                style={styles.input}
                value={birthYear}
                onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="1995"
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
              />
            </View>

            <Pressable style={styles.agreeRow} onPress={() => setAgreed((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
              <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={agreed ? colors.primary : colors.textDim} />
              <Text style={styles.agreeText}>
                I am 18 or older. I will only use my own face, or faces I have permission to use, and I will follow the
                community rules: no nudity, no hate, no harming others.
              </Text>
            </Pressable>

            {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}

            <Button title="Start creating" icon="arrow-forward" onPress={submit} style={{ marginTop: space.sm }} />
            <Text style={styles.small}>For now your account is saved on this phone only. Cloud accounts are coming in a later update.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, paddingTop: space.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  brand: { color: colors.primary, fontSize: 44, fontFamily: fonts.displayItalic, letterSpacing: -1 },
  logoLetter: { color: colors.onPrimary, fontSize: 32, fontFamily: fonts.displayItalic, marginTop: -4 },
  headline: { color: colors.text, fontSize: 34, fontFamily: fonts.display, lineHeight: 40, marginTop: space.md },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 17, paddingHorizontal: space.md, paddingVertical: 14,
  },
  hint: { color: colors.textDim, fontSize: 13 },
  agreeRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginTop: space.sm },
  agreeText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20 },
  small: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
});
