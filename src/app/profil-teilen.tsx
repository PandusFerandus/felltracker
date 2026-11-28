import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Card, PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { profileFacts, profileHtml } from '@/data/pdf-html';
import { useToday } from '@/data/use-today';
import { SHARE_PDF_LABEL, sharePdf } from '@/lib/share-pdf';
import { colors, fonts } from '@/theme';

export default function ShareProfileScreen() {
  const { loading, activeDog } = useAppData();
  const today = useToday();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!activeDog) return <Redirect href="/" />;
  const dog = activeDog;

  async function share() {
    setBusy(true);
    setMsg(null);
    try {
      await sharePdf(profileHtml({ dog, today }), `Hundeprofil ${dog.name}`);
    } catch {
      setMsg('Das PDF konnte nicht erstellt werden. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Profil teilen" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>So sieht das PDF aus:</Text>
        <Card style={styles.preview}>
          <Text style={styles.brand}>Felltagebuch · Hundeprofil</Text>
          <Avatar photo={dog.photo} size={110} />
          <Text style={styles.name}>{dog.name}</Text>
          {profileFacts(dog, today).map((f) => (
            <View key={f.label} style={styles.fact}>
              <Text style={styles.label}>{f.label}</Text>
              <Text style={styles.value}>{f.value}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label={SHARE_PDF_LABEL} onPress={share} disabled={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 10, paddingHorizontal: 16, paddingBottom: 20 },
  hint: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  preview: { gap: 6 },
  brand: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.primary },
  name: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.text },
  fact: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  value: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  footer: { gap: 8, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24 },
});
