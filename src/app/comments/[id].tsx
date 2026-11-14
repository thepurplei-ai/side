import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { REPORT_REASONS } from '@/components/VideoCard';
import { Avatar, Body, timeAgo } from '@/components/ui';
import { checkComment } from '@/services/moderation';
import { newId, useStore } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';
import type { Comment } from '@/types';

export default function Comments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const comments = state.comments.filter((c) => c.videoId === id && !state.hidden[c.id]).sort((a, b) => b.createdAt - a.createdAt);

  const post = () => {
    const mod = checkComment(text);
    if (!mod.ok) return setError(mod.reason!);
    dispatch({ type: 'addComment', comment: { id: newId('c'), videoId: id, userId: state.me!.id, text: text.trim(), createdAt: Date.now() } });
    setText('');
    setError('');
  };

  const options = (c: Comment) => {
    if (c.userId === state.me?.id) {
      return Alert.alert('Your comment', undefined, [
        { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'deleteComment', commentId: c.id }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
    Alert.alert('Report comment', 'Why?', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => dispatch({ type: 'report', report: { id: newId('r'), targetType: 'comment', targetId: c.id, reason, createdAt: Date.now() } }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: space.md, gap: space.md }}
          ListEmptyComponent={<Body dim style={{ textAlign: 'center', marginTop: space.xl }}>No comments yet. Say something nice!</Body>}
          renderItem={({ item: c }) => {
            const u = state.users.find((x) => x.id === c.userId);
            return (
              <Pressable style={styles.comment} onLongPress={() => options(c)}>
                <Avatar name={u?.displayName ?? '?'} color={u?.avatarColor ?? colors.accent} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>@{u?.username ?? 'someone'} <Text style={styles.time}>· {timeAgo(c.createdAt)}</Text></Text>
                  <Text style={styles.text}>{c.text}</Text>
                </View>
                <Pressable onPress={() => options(c)} hitSlop={8}>
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.textDim} />
                </Pressable>
              </Pressable>
            );
          }}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.inputRow}>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Add a kind comment…" placeholderTextColor={colors.textDim} maxLength={300} onSubmitEditing={post} returnKeyType="send" />
          <Pressable style={styles.send} onPress={post}>
            <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  comment: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  name: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13 },
  time: { fontWeight: '400' },
  text: { color: colors.text, fontSize: 15, marginTop: 2 },
  error: { color: colors.danger, paddingHorizontal: space.md },
  inputRow: { flexDirection: 'row', gap: space.sm, padding: space.md, borderTopWidth: 1, borderColor: colors.border },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, color: colors.text, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
