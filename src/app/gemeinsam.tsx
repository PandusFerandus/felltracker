import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Field, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { authMessage, isValidEmail } from '@/data/auth-messages';
import type { PendingInvite, Person } from '@/data/remote';
import { deleteInvite, dogPeople, inviteByEmail, pendingInvites, removeMember } from '@/data/remote-supabase';
import { colors, fonts, radius } from '@/theme';

export default function SharedScreen() {
  const { account, activeDog, syncNow } = useAppData();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!account || !activeDog) {
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
          <PrimaryButton label="Konto erstellen" onPress={() => router.push({ pathname: '/anmelden', params: { registrieren: '1' } })} />
          <SecondaryButton label="Später" onPress={back} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <Members dogId={activeDog.id} dogName={activeDog.name} myId={account.id} myEmail={account.email} onChanged={syncNow} onBack={back} />;
}

function Members({ dogId, dogName, myId, myEmail, onChanged, onBack }: { dogId: string; dogName: string; myId: string; myEmail: string; onChanged(): Promise<void>; onBack(): void }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const isOwner = people?.some((p) => p.userId === myId && p.role === 'owner') ?? false;

  const load = useCallback(async () => {
    try {
      const list = await dogPeople(dogId);
      setPeople(list);
      if (list.some((p) => p.userId === myId && p.role === 'owner')) setInvites(await pendingInvites(dogId));
    } catch (e) {
      setPeople([]);
      setMsg(`${authMessage(e)} Personen können nur mit Internet angezeigt werden.`);
    }
  }, [dogId, myId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) return setMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (clean === myEmail.toLowerCase()) return setMsg('Das ist deine eigene E-Mail-Adresse.');
    if (people?.some((p) => p.email.toLowerCase() === clean)) return setMsg('Diese Person verwaltet schon mit.');
    setBusy(true);
    try {
      const res = await inviteByEmail(dogId, clean);
      setEmail('');
      setMsg(
        res === 'exists'
          ? 'Diese Person ist schon eingeladen.'
          : `Eingeladen. Die Einladung erscheint, sobald sich die Person mit ${clean} in Felltagebuch anmeldet. Sag ihr am besten Bescheid.`,
      );
      await load();
    } catch (e) {
      setMsg(authMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    try {
      await removeMember(dogId, userId);
      setConfirm(null);
      setMsg('Die Person wurde entfernt.');
      await load();
      await onChanged();
    } catch (e) {
      setMsg(authMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvite(id: string) {
    try {
      await deleteInvite(id);
      await load();
    } catch (e) {
      setMsg(authMessage(e));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Gemeinsam verwalten" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.text}>Wer kann {dogName} sehen und eintragen?</Text>
        {people === null && <ActivityIndicator color={colors.primary} accessibilityLabel="Wird geladen" />}
        {people?.map((p) => (
          <View key={p.userId} style={styles.person}>
            <View style={styles.personText}>
              <Text style={styles.personName}>{p.userId === myId ? `${p.name || p.email} (du)` : p.name || p.email}</Text>
              <Text style={styles.personRole}>{p.role === 'owner' ? 'Besitzer:in' : 'Verwaltet mit'}</Text>
            </View>
            {isOwner && p.role !== 'owner' && (
              <Pressable accessibilityRole="button" accessibilityLabel={`${p.name || p.email} entfernen`} onPress={() => setConfirm(p.userId)} style={styles.small}>
                <Text style={styles.smallText}>Entfernen</Text>
              </Pressable>
            )}
            {confirm === p.userId && (
              <View style={styles.confirm}>
                <Text style={styles.text}>{p.name || p.email} entfernen? Die Person sieht {dogName} dann nicht mehr.</Text>
                <PrimaryButton small label="Ja, entfernen" onPress={() => remove(p.userId)} disabled={busy} />
                <SecondaryButton label="Abbrechen" onPress={() => setConfirm(null)} />
              </View>
            )}
          </View>
        ))}
        {invites.map((i) => (
          <View key={i.id} style={styles.person}>
            <View style={styles.personText}>
              <Text style={styles.personName}>{i.email}</Text>
              <Text style={styles.personRole}>Eingeladen</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Einladung an ${i.email} zurückziehen`} onPress={() => cancelInvite(i.id)} style={styles.small}>
              <Text style={styles.smallText}>Zurückziehen</Text>
            </Pressable>
          </View>
        ))}

        {msg != null && <StatusMessage>{msg}</StatusMessage>}

        {people !== null && people.length > 0 && isOwner && (
          <View style={styles.inviteBox}>
            <Field
              label="Person per E-Mail einladen"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setMsg(null);
              }}
              placeholder="name@beispiel.de"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={invite}
            />
            <PrimaryButton small label="Einladen" onPress={invite} disabled={busy} />
          </View>
        )}
        {people !== null && people.length > 0 && !isOwner && <Text style={styles.hint}>Nur die Besitzerperson kann einladen oder entfernen.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 10, paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  person: { backgroundColor: colors.card, borderRadius: radius.card - 2, padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  personText: { flex: 1, minWidth: 160, gap: 2 },
  personName: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  personRole: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  small: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: colors.border },
  smallText: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.primary },
  confirm: { width: '100%', gap: 8, marginTop: 6 },
  inviteBox: { gap: 10, marginTop: 12 },
});
