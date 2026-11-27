import { Image, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { PawIcon } from './icons';

/** Rundes Profilbild; ohne Foto eine Pfote. */
export function Avatar({ photo, size }: { photo: string; size: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.img} accessibilityLabel="Profilbild" resizeMode="cover" />
      ) : (
        <PawIcon size={Math.round(size * 0.58)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 6,
    borderColor: colors.card,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
});
