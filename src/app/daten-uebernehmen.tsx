import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ScreenHeader, SecondaryButton } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

/** Nach dem Anmelden: Auf dem Gerät gibt es Hunde ohne Konto. */
export default function TakeOverScreen() {
  const { guestDataQuestion, dogs, account, answerGuestData } = useAppData();
  const [busy, setBusy] = useState(false);
  if (!guestDataQuestion) return <Redirect href="/" />;
  const guestDogs = dogs.filter((d) => !d.ownerId).map((d) => d.name);

  async function answer(take: boolean) {
    setBusy(true);
    await answerGuestData(take);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Daten übernehmen?" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.text}>
            Auf diesem Gerät gibt es Einträge ohne Konto ({guestDogs.join(', ')}). Sollen sie in dein Konto
            {account?.email ? ` (${account.email})` : ''} übernommen werden?
          </Text>
          <Text style={styles.hint}>Dabei wird nichts gelöscht.</Text>
        </Card>
        <PrimaryButton label="Ja, übernehmen" onPress={() => answer(true)} disabled={busy} />
        <SecondaryButton label="Nein, wieder abmelden" onPress={() => answer(false)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  text: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  hint: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
