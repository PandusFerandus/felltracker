import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { squareCrop } from '@/data/photo-logic';

export type PhotoResult = { kind: 'ok'; dataUri: string } | { kind: 'cancelled' } | { kind: 'error'; message: string };

/**
 * Lässt ein Foto aufnehmen oder auswählen, schneidet es quadratisch zu,
 * verkleinert es auf höchstens 512 px und gibt es als JPEG-Daten-URI zurück.
 */
export async function pickProfilePhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  try {
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return { kind: 'error', message: 'Die Kamera ist nicht erlaubt. Du kannst das in den Einstellungen deines Handys ändern.' };
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      // Auf dem Handy kann man den Ausschnitt selbst wählen; im Browser wird mittig zugeschnitten.
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
      quality: 1,
    };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return { kind: 'cancelled' };

    const asset = result.assets[0];
    const { crop, size } = squareCrop(asset.width, asset.height);
    const context = ImageManipulator.manipulate(asset.uri);
    if (crop.width > 0) context.crop(crop);
    context.resize({ width: size, height: size });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (!saved.base64) return { kind: 'error', message: 'Das Foto konnte nicht gespeichert werden.' };
    return { kind: 'ok', dataUri: `data:image/jpeg;base64,${saved.base64}` };
  } catch {
    return { kind: 'error', message: 'Das Foto konnte nicht geladen werden. Bitte versuch es noch einmal.' };
  }
}
