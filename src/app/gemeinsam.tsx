import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

export default function SharedScreen() {
  const { activeDog } = useAppData();
  const [msg, setMsg] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Gemeinsam verwalten" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text accessibilityRole="header" style={styles.title}>
            Dafür brauchst du ein Konto
          </Text>
          <Text style={styles.text}>
            Damit andere {activeDog?.name ?? 'deinen Hund'} mit dir verwalten können, müssen die Daten auf einem Server liegen. Deine
            bisherigen Einträge werden dann übernommen.
          </Text>
        </Card>
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label="Konto erstellen" onPress={() => setMsg('Kommt bald.')} />
        <SecondaryButton label="Später" onPress={back} />
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
