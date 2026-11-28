import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PawIcon } from '@/components/icons';
import { Field, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { accountsEnabled } from '@/config';
import { useAppData } from '@/data/app-data';
import { isValidEmail } from '@/data/auth-messages';
import { colors, fonts } from '@/theme';

export default function LoginScreen() {
  const { registrieren } = useLocalSearchParams<{ registrieren?: string }>();
  const { loading, mode, account, signIn, signUp, startGuest } = useAppData();
  const [registering, setRegistering] = useState(registrieren === '1');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Aus "Konto erstellen" heraus (schon ohne Konto unterwegs): mit Zurück-Knopf
  const fromGuest = mode === 'guest';

  if (loading) return null;
  if (account) return <Redirect href="/" />;

  async function submit() {
    setMsg(null);
    if (registering && !name.trim()) return setMsg('Bitte gib deinen Namen ein.');
    if (!isValidEmail(email)) return setMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (password.length < 8) return setMsg('Das Passwort braucht mindestens 8 Zeichen.');
    setBusy(true);
    const res = registering ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if ('error' in res) return setMsg(res.error);
    if ('needsCode' in res) {
      router.push({ pathname: '/code', params: { email: email.trim().toLowerCase(), art: 'signup' } });
      return;
    }
    router.dismissAll();
    router.replace('/');
  }

  async function guest() {
    await startGuest();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      {fromGuest && <ScreenHeader title={registering ? 'Konto erstellen' : 'Anmelden'} onBack={() => router.back()} />}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, fromGuest && styles.contentTop]} keyboardShouldPersistTaps="handled">
          {fromGuest && registering && (
            <Text style={styles.intro}>Mit einem Konto kannst du Hunde gemeinsam verwalten. Deine bisherigen Einträge werden übernommen.</Text>
          )}
          {!fromGuest && (
            <View style={styles.brand}>
              <View style={styles.logo}>
                <PawIcon size={64} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                Felltagebuch
              </Text>
              <Text style={styles.subtitle}>dein Hundetagebuch</Text>
            </View>
          )}

          {accountsEnabled ? (
            <>
              {!fromGuest && <Text style={styles.heading}>{registering ? 'Konto erstellen' : 'Anmelden'}</Text>}
              {registering && <Field label="Dein Name" value={name} onChangeText={setName} autoComplete="name" maxLength={60} />}
              <Field
                label="E-Mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                maxLength={254}
              />
              <Field
                label="Passwort"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={registering ? 'new-password' : 'current-password'}
                placeholder={registering ? 'mindestens 8 Zeichen' : undefined}
                maxLength={72}
                onSubmitEditing={submit}
              />
              {msg != null && <StatusMessage>{msg}</StatusMessage>}
              <PrimaryButton label={registering ? 'Registrieren' : 'Anmelden'} onPress={submit} disabled={busy} />
              <SecondaryButton
                label={registering ? 'Ich habe schon ein Konto' : 'Neues Konto erstellen'}
                onPress={() => {
                  setRegistering(!registering);
                  setMsg(null);
                }}
              />
              {!registering && (
                <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/passwort-vergessen', params: { email } })} style={styles.link}>
                  <Text style={styles.linkText}>Passwort vergessen?</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.hint}>Konten sind noch nicht eingerichtet.</Text>
          )}

          {!fromGuest && (
            <View style={styles.guest}>
              <SecondaryButton label="Ohne Konto starten" onPress={guest} />
              <Text style={styles.hint}>Ohne Konto bleiben deine Daten nur auf diesem Gerät.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 20 },
  contentTop: { justifyContent: 'flex-start', paddingTop: 4 },
  intro: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  brand: { alignItems: 'center', gap: 4, marginBottom: 8 },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    borderColor: colors.card,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 30, color: colors.text },
  subtitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  heading: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
  guest: { gap: 8, marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  hint: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
