import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Body, Button, Card, Label, Notice, Title } from '@/components/ui';
import { checkText } from '@/services/moderation';
import { hashPin, newId, useStore } from '@/store/AppStore';
import { colors, radius, space, fonts } from '@/theme';

const CHILD_COLORS = ['#38BDF8', '#34D399', '#FBBF24', '#A78BFA', '#FB7185'];

function PinInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      style={styles.pin}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 4))}
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      keyboardType="number-pad"
      secureTextEntry
      maxLength={4}
    />
  );
}

export default function FamilyScreen() {
  const { state, dispatch } = useStore();
  const { family } = state;
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [childName, setChildName] = useState('');
  const [error, setError] = useState('');

  const turnOn = () => {
    if (pin.length !== 4) return setError('Choose a 4-digit PIN.');
    if (pin !== pin2) return setError('The two PINs are different.');
    dispatch({ type: 'setFamily', family: { ...family, enabled: true, pinHash: hashPin(pin) } });
    setPin('');
    setPin2('');
    setError('');
  };

  const turnOff = () => {
    if (hashPin(pin) !== family.pinHash) return setError('Wrong PIN.');
    dispatch({ type: 'setFamily', family: { ...family, enabled: false } });
    setPin('');
    setError('');
    router.back();
  };

  const addChild = () => {
    const name = childName.trim();
    if (!name) return;
    const mod = checkText(name);
    if (!mod.ok) return setError(mod.reason!);
    dispatch({ type: 'addChild', child: { id: newId('ch'), name, avatarColor: CHILD_COLORS[family.children.length % CHILD_COLORS.length] } });
    setChildName('');
    setError('');
  };

  const removeChild = (id: string, name: string) =>
    Alert.alert(`Remove ${name}?`, 'Their stories stay in your Studio.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'removeChild', childId: id }) },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Ionicons name="people" size={36} color={colors.family} />
        <Title style={{ fontSize: 22 }}>Make stories with your children</Title>
      </View>
      <Card style={{ gap: space.sm }}>
        {[
          'Private: nothing is published, and the public feed and comments are hidden.',
          'Gentle: the AI Director only makes child-friendly stories.',
          'You stay in charge: a PIN is needed to leave Family Mode.',
          'Children never have their own account. Everything stays on your account.',
        ].map((t) => (
          <View key={t} style={styles.point}>
            <Ionicons name="checkmark-circle" size={18} color={colors.family} />
            <Body style={{ flex: 1 }}>{t}</Body>
          </View>
        ))}
      </Card>

      {!family.enabled ? (
        <>
          <Label>Choose a parent PIN</Label>
          <View style={styles.pinRow}>
            <PinInput value={pin} onChange={setPin} placeholder="PIN" />
            <PinInput value={pin2} onChange={setPin2} placeholder="Again" />
          </View>
          {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}
          <Button title="Turn on Family Mode" variant="family" icon="shield-checkmark" onPress={turnOn} />
        </>
      ) : (
        <>
          <Label>Children</Label>
          {family.children.map((c) => (
            <View key={c.id} style={styles.child}>
              <Avatar name={c.name} color={c.avatarColor} size={40} />
              <Text style={styles.childName}>{c.name}</Text>
              <Pressable onPress={() => removeChild(c.id, c.name)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={colors.textDim} />
              </Pressable>
            </View>
          ))}
          <View style={styles.pinRow}>
            <TextInput style={[styles.pin, { flex: 1, letterSpacing: 0 }]} value={childName} onChangeText={setChildName} placeholder="Child's first name" placeholderTextColor={colors.textDim} maxLength={20} />
            <Button small title="Add" variant="family" onPress={addChild} />
          </View>
          <Body dim style={{ fontSize: 13 }}>Only a first name or nickname. No other details about your child are stored.</Body>

          <Label style={{ marginTop: space.lg }}>Leave Family Mode</Label>
          <View style={styles.pinRow}>
            <PinInput value={pin} onChange={setPin} placeholder="Parent PIN" />
            <Button small title="Turn off" variant="ghost" onPress={turnOff} />
          </View>
          {!!error && <Notice icon="alert-circle" color={colors.danger} text={error} />}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  point: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  pinRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  pin: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 20, padding: space.md, letterSpacing: 6, textAlign: 'center',
  },
  child: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  childName: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, flex: 1 },
});
