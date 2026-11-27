import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CameraIcon } from '@/components/icons';
import { PhotoSheet } from '@/components/photo-sheet';
import { Card, Field, PrimaryButton, ScreenHeader, SecondaryButton, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { ageLabel, formatGermanDate, parseBirthday } from '@/data/dates';
import type { Dog } from '@/data/types';
import { useToday } from '@/data/use-today';
import { pickProfilePhoto } from '@/lib/pick-photo';
import { colors, fonts } from '@/theme';

type Form = {
  name: string;
  birthday: string;
  breed: string;
  medication: string;
  foodType: string;
  foodAmount: string;
  vetPractice: string;
  vetAddress: string;
  vetPhone: string;
  info: string;
};

const toForm = (dog: Dog): Form => ({
  name: dog.name,
  birthday: formatGermanDate(dog.birthday),
  breed: dog.breed,
  medication: dog.medication,
  foodType: dog.foodType,
  foodAmount: dog.foodAmount,
  vetPractice: dog.vet.practice,
  vetAddress: dog.vet.address,
  vetPhone: dog.vet.phone,
  info: dog.info,
});

export default function ProfileScreen() {
  const { loading, activeDog } = useAppData();
  if (loading) return null;
  if (!activeDog) return <Redirect href="/" />;
  return <ProfileForm key={activeDog.id} dog={activeDog} />;
}

function ProfileForm({ dog }: { dog: Dog }) {
  const { updateDog } = useAppData();
  const today = useToday();
  const [form, setForm] = useState<Form>(() => toForm(dog));
  const [saved, setSaved] = useState<Form>(() => toForm(dog));
  const [msg, setMsg] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const set = (key: keyof Form) => (text: string) => {
    setForm((f) => ({ ...f, [key]: text }));
    setMsg(null);
    setConfirmLeave(false);
  };
  const birthday = parseBirthday(form.birthday, today);
  const age = birthday.ok && birthday.value ? ageLabel(birthday.value, today) : '';
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function save(): Promise<boolean> {
    const name = form.name.trim();
    if (!name) {
      setMsg('Bitte gib einen Namen ein.');
      return false;
    }
    if (!birthday.ok) {
      setMsg(birthday.message);
      return false;
    }
    try {
      const t = (s: string) => s.trim();
      await updateDog(dog.id, {
        name,
        birthday: birthday.value,
        breed: t(form.breed),
        medication: t(form.medication),
        foodType: t(form.foodType),
        foodAmount: t(form.foodAmount),
        vet: { practice: t(form.vetPractice), address: t(form.vetAddress), phone: t(form.vetPhone) },
        info: t(form.info),
      });
      const next = { ...form, name, birthday: formatGermanDate(birthday.value) };
      setForm(next);
      setSaved(next);
      setMsg('Profil gespeichert.');
      return true;
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
      return false;
    }
  }

  async function choosePhoto(source: 'camera' | 'library') {
    setSheet(false);
    const res = await pickProfilePhoto(source);
    if (res.kind === 'cancelled') return;
    if (res.kind === 'error') {
      setMsg(res.message);
      return;
    }
    await updateDog(dog.id, { photo: res.dataUri });
    setMsg('Profilbild gespeichert.');
  }

  async function removePhoto() {
    setSheet(false);
    await updateDog(dog.id, { photo: '' });
    setMsg('Profilbild entfernt.');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Hundeprofil" onBack={() => (dirty ? setConfirmLeave(true) : leave())} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {confirmLeave && (
            <Card>
              <Text style={styles.confirmText}>Du hast Änderungen, die noch nicht gespeichert sind.</Text>
              <PrimaryButton small label="Speichern und zurück" onPress={async () => (await save()) && leave()} />
              <SecondaryButton label="Ohne Speichern zurück" onPress={leave} />
            </Card>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilbild ändern"
            onPress={() => {
              setMsg(null);
              setSheet(true);
            }}
            style={styles.photoButton}>
            <Avatar photo={dog.photo} size={150} />
            <View style={styles.cameraBadge}>
              <CameraIcon />
            </View>
          </Pressable>

          <Field label="Hundename" value={form.name} onChangeText={set('name')} maxLength={40} autoCapitalize="words" />
          <Field
            label="Geburtstag"
            value={form.birthday}
            onChangeText={set('birthday')}
            placeholder="TT.MM.JJJJ"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Text style={styles.age}>Alter: {age || 'noch nicht angegeben'}</Text>
          <Field label="Rasse" value={form.breed} onChangeText={set('breed')} maxLength={60} />
          <Field label="Medikamente" value={form.medication} onChangeText={set('medication')} multiline maxLength={500} />
          <Field label="Futterart" value={form.foodType} onChangeText={set('foodType')} maxLength={80} />
          <Field label="Futtermenge" value={form.foodAmount} onChangeText={set('foodAmount')} maxLength={80} />

          <Text accessibilityRole="header" style={styles.section}>
            Haustierarzt
          </Text>
          <Field label="Praxis" value={form.vetPractice} onChangeText={set('vetPractice')} maxLength={80} />
          <Field label="Adresse" value={form.vetAddress} onChangeText={set('vetAddress')} multiline maxLength={200} />
          <Field label="Telefon" value={form.vetPhone} onChangeText={set('vetPhone')} keyboardType="phone-pad" maxLength={40} />

          <Field label="Wichtige weitere Infos" value={form.info} onChangeText={set('info')} multiline maxLength={2000} style={styles.infoInput} />
        </ScrollView>

        <View style={styles.footer}>
          {msg != null && <StatusMessage>{msg}</StatusMessage>}
          <PrimaryButton label="Profil speichern" onPress={save} />
          <SecondaryButton
            label="Als PDF teilen"
            onPress={() => {
              if (dirty) {
                setMsg('Bitte speichere zuerst deine Änderungen.');
                return;
              }
              router.push('/profil-teilen');
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <PhotoSheet
        visible={sheet}
        hasPhoto={!!dog.photo}
        onCamera={() => choosePhoto('camera')}
        onLibrary={() => choosePhoto('library')}
        onRemove={removePhoto}
        onClose={() => setSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 20 },
  photoButton: { alignSelf: 'center', marginBottom: 4 },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  age: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted, marginTop: -4 },
  section: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text, marginTop: 8 },
  infoInput: { minHeight: 110 },
  confirmText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  footer: { gap: 8, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24 },
});
