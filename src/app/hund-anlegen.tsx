import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PawIcon } from '@/components/icons';
import { PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts, radius } from '@/theme';

export default function CreateDogScreen() {
  const { dogs, createDog } = useAppData();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const first = dogs.length === 0;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg('Bitte gib einen Namen ein.');
      return;
    }
    setSaving(true);
    try {
      await createDog(trimmed);
      router.replace('/');
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title={first ? 'Willkommen' : 'Hund hinzufügen'}
        onBack={first ? undefined : () => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatar}>
            <PawIcon size={80} />
          </View>
          {first && (
            <Text style={styles.text}>
              Lege zuerst deinen Hund an. Der Name genügt, alles Weitere kannst du später ergänzen.
            </Text>
          )}
          <Text nativeID="dogNameLabel" style={styles.label}>
            Name des Hundes
          </Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              setMsg(null);
            }}
            accessibilityLabel="Name des Hundes"
            accessibilityLabelledBy="dogNameLabel"
            placeholder="z. B. Bella"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={save}
            style={styles.input}
          />
          {msg != null && <StatusMessage>{msg}</StatusMessage>}
          {first && <Text style={styles.hint}>Deine Daten bleiben nur auf diesem Handy.</Text>}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label="Hund anlegen" onPress={save} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatar: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: colors.card,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.text,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
