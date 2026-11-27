import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CheckIcon } from '@/components/icons';
import { Field, PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts, radius } from '@/theme';

export default function DogsScreen() {
  const { dogs, activeDog, selectDog, createDog } = useAppData();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(id: string) {
    if (id !== activeDog?.id) await selectDog(id);
    router.dismissTo('/');
  }

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg('Bitte gib einen Namen ein.');
      return;
    }
    setBusy(true);
    try {
      await createDog(trimmed);
      setName('');
      router.dismissTo('/');
      router.push('/profil');
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Meine Hunde" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {dogs.map((d) => {
            const on = d.id === activeDog?.id;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`${d.name}, dein Hund${on ? ', ausgewählt' : ''}`}
                aria-selected={on}
                onPress={() => pick(d.id)}
                style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}>
                <Avatar photo={d.photo} size={56} />
                <View style={styles.rowText}>
                  <Text style={styles.dogName} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={styles.dogSub}>{on ? 'ausgewählt · dein Hund' : 'dein Hund'}</Text>
                </View>
                {on && (
                  <View style={styles.check}>
                    <CheckIcon />
                  </View>
                )}
              </Pressable>
            );
          })}

          <View style={styles.add}>
            <Field
              label="Neuen Hund hinzufügen"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setMsg(null);
              }}
              placeholder="Name des Hundes"
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={add}
            />
            {msg != null && <StatusMessage>{msg}</StatusMessage>}
            <PrimaryButton small label="+ Hund hinzufügen" onPress={add} disabled={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: 10, paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: colors.card,
    backgroundColor: colors.card,
  },
  rowOn: { borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  rowText: { flex: 1, gap: 2 },
  dogName: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.text },
  dogSub: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  check: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  add: { gap: 10, marginTop: 16 },
});
