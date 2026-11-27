import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

export default function AccountScreen() {
  const { deleteAllData } = useAppData();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteAll() {
    setBusy(true);
    try {
      await deleteAllData();
      router.dismissAll();
      router.replace('/hund-anlegen');
    } catch {
      setMsg('Das Löschen hat nicht geklappt. Bitte versuch es noch einmal.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Mein Konto" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text accessibilityRole="header" style={styles.title}>
            Du nutzt die App ohne Konto
          </Text>
          <Text style={styles.text}>
            Deine Daten liegen nur auf diesem Handy. Geht es verloren oder löschst du die App, können sie weg sein.
          </Text>
        </Card>
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label="Konto erstellen" onPress={() => setMsg('Kommt bald.')} />
        {!confirm && (
          <SecondaryButton
            label="Alle Daten löschen"
            onPress={() => {
              setMsg(null);
              setConfirm(true);
            }}
          />
        )}
        {confirm && (
          <Card>
            <Text style={styles.title}>Wirklich löschen?</Text>
            <Text style={styles.text}>Alle Hunde, Einträge und eigenen Punkte auf diesem Gerät wären dauerhaft weg.</Text>
            <PrimaryButton small label="Ja, endgültig löschen" onPress={deleteAll} disabled={busy} />
            <SecondaryButton label="Abbrechen" onPress={() => setConfirm(false)} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
