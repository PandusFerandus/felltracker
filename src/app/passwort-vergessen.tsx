import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { isValidEmail } from '@/data/auth-messages';
import { colors, fonts } from '@/theme';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestPasswordReset } = useAppData();
  const [email, setEmail] = useState(params.email ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!isValidEmail(email)) return setMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
    setBusy(true);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if ('error' in res) return setMsg(res.error);
    router.replace({ pathname: '/code', params: { email: email.trim().toLowerCase(), art: 'recovery' } });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Passwort vergessen" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.text}>Gib deine E-Mail-Adresse ein. Wir schicken dir einen Code, mit dem du ein neues Passwort festlegen kannst.</Text>
        <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label="Code schicken" onPress={send} disabled={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  text: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
});
