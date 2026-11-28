import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

export default function NewPasswordScreen() {
  const { setNewPassword, setFlash } = useAppData();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (password.length < 8) return setMsg('Das Passwort braucht mindestens 8 Zeichen.');
    if (password !== repeat) return setMsg('Die beiden Passwörter sind nicht gleich.');
    setBusy(true);
    const res = await setNewPassword(password);
    setBusy(false);
    if ('error' in res) return setMsg(res.error);
    setFlash('Dein neues Passwort ist gespeichert.');
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Neues Passwort" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.text}>Lege ein neues Passwort fest.</Text>
        <Field label="Neues Passwort" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" placeholder="mindestens 8 Zeichen" maxLength={72} />
        <Field label="Passwort wiederholen" value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={72} onSubmitEditing={save} />
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label="Passwort speichern" onPress={save} disabled={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  text: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
});
