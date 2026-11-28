import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

/** Code aus der E-Mail eingeben (Konto bestätigen oder Passwort zurücksetzen). */
export default function CodeScreen() {
  const { email = '', art = 'signup' } = useLocalSearchParams<{ email?: string; art?: string }>();
  const type = art === 'recovery' ? 'recovery' : 'signup';
  const { verifyCode, resendCode } = useAppData();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(clean)) return setMsg('Bitte gib den Code aus der E-Mail ein (nur Ziffern).');
    setBusy(true);
    const res = await verifyCode(email, clean, type);
    setBusy(false);
    if ('error' in res) return setMsg(res.error);
    router.dismissAll();
    router.replace(type === 'recovery' ? '/neues-passwort' : '/');
  }

  async function resend() {
    setMsg(null);
    const res = await resendCode(email, type);
    setMsg('error' in res ? res.error : 'Wir haben dir einen neuen Code geschickt.');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={type === 'recovery' ? 'Passwort zurücksetzen' : 'Konto bestätigen'} onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.text}>
            Wir haben eine E-Mail an <Text style={styles.bold}>{email}</Text> geschickt. Gib hier den Code aus der E-Mail ein.
          </Text>
          <Text style={styles.hint}>Keine E-Mail da? Schau auch im Spam-Ordner nach.</Text>
          <Field
            label="Code aus der E-Mail"
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setMsg(null);
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={12}
            onSubmitEditing={confirm}
            style={styles.codeInput}
          />
          {msg != null && <StatusMessage>{msg}</StatusMessage>}
          <PrimaryButton label="Bestätigen" onPress={confirm} disabled={busy} />
          <SecondaryButton label="Neuen Code schicken" onPress={resend} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  text: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  bold: { fontFamily: fonts.extraBold },
  hint: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  codeInput: { fontSize: 24, letterSpacing: 6, textAlign: 'center' },
});
