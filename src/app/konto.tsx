import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts } from '@/theme';

function syncLine(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Noch nicht abgeglichen.';
  const d = new Date(lastSyncAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Zuletzt abgeglichen: ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
}

export default function AccountScreen() {
  const { account, deleteAllData, signOut, deleteAccount, sync, syncNow } = useAppData();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'delete-all' | 'delete-account' | 'logout-pending' | null>(null);
  const [busy, setBusy] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const leave = () => {
    router.dismissAll();
    router.replace('/');
  };

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setMsg(null);
    try {
      if (await action()) leave();
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Mein Konto" onBack={back} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text accessibilityRole="header" style={styles.title}>
              Du nutzt die App ohne Konto
            </Text>
            <Text style={styles.text}>Deine Daten liegen nur auf diesem Gerät. Geht es verloren oder löschst du die App, können sie weg sein.</Text>
          </Card>
          {msg != null && <StatusMessage>{msg}</StatusMessage>}
          <PrimaryButton label="Konto erstellen" onPress={() => router.push({ pathname: '/anmelden', params: { registrieren: '1' } })} />
          <SecondaryButton label="Mit vorhandenem Konto anmelden" onPress={() => router.push('/anmelden')} />
          {confirm !== 'delete-all' && <SecondaryButton label="Alle Daten löschen" onPress={() => setConfirm('delete-all')} />}
          {confirm === 'delete-all' && (
            <Card>
              <Text style={styles.title}>Wirklich löschen?</Text>
              <Text style={styles.text}>Alle Hunde, Einträge und eigenen Punkte auf diesem Gerät wären dauerhaft weg.</Text>
              <PrimaryButton small label="Ja, endgültig löschen" onPress={() => run(async () => (await deleteAllData(), true))} disabled={busy} />
              <SecondaryButton label="Abbrechen" onPress={() => setConfirm(null)} />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Mein Konto" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text accessibilityRole="header" style={styles.title}>
            {account.name || 'Dein Konto'}
          </Text>
          <Text style={styles.text}>{account.email}</Text>
        </Card>

        <Card>
          <Text style={styles.label}>Abgleich</Text>
          <Text style={styles.text}>{sync.syncing ? 'Wird gerade abgeglichen …' : syncLine(sync.lastSyncAt)}</Text>
          {sync.pending > 0 && (
            <Text style={styles.text}>
              {sync.pending === 1 ? '1 Änderung wartet' : `${sync.pending} Änderungen warten`} auf die Übertragung.
            </Text>
          )}
          {sync.offline && <Text style={styles.text}>Gerade keine Verbindung zum Server. Deine Einträge werden später übertragen.</Text>}
          <SecondaryButton label="Jetzt abgleichen" onPress={() => void syncNow()} />
        </Card>

        {msg != null && <StatusMessage>{msg}</StatusMessage>}

        {confirm === null && (
          <>
            <PrimaryButton
              label="Abmelden"
              onPress={() =>
                run(async () => {
                  const res = await signOut();
                  if ('pending' in res) {
                    setConfirm('logout-pending');
                    return false;
                  }
                  return true;
                })
              }
              disabled={busy}
            />
            <SecondaryButton label="Konto löschen" onPress={() => setConfirm('delete-account')} />
          </>
        )}

        {confirm === 'logout-pending' && (
          <Card>
            <Text style={styles.title}>Noch nicht alles übertragen</Text>
            <Text style={styles.text}>
              Einige Änderungen sind noch nicht auf dem Server. Verbinde dich mit dem Internet und tippe auf „Jetzt abgleichen“. Meldest du
              dich jetzt ab, gehen diese Änderungen verloren.
            </Text>
            <PrimaryButton small label="Abbrechen" onPress={() => setConfirm(null)} />
            <SecondaryButton label="Trotzdem abmelden" onPress={() => run(async () => (await signOut(true), true))} />
          </Card>
        )}

        {confirm === 'delete-account' && (
          <Card>
            <Text style={styles.title}>Konto wirklich löschen?</Text>
            <Text style={styles.text}>
              Dein Konto und deine Daten werden auch auf dem Server dauerhaft gelöscht. Hunde, die du mit anderen teilst, gehen an die Person
              über, die am längsten mitverwaltet. Alle anderen Hunde werden mit ihren Einträgen gelöscht.
            </Text>
            <PrimaryButton
              small
              label="Ja, Konto endgültig löschen"
              onPress={() =>
                run(async () => {
                  const res = await deleteAccount();
                  if ('error' in res) {
                    setMsg(res.error);
                    return false;
                  }
                  return true;
                })
              }
              disabled={busy}
            />
            <SecondaryButton label="Abbrechen" onPress={() => setConfirm(null)} />
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
  label: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
