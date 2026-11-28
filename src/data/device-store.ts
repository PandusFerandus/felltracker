import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { createLocalStore, type LocalStore } from './storage';

/** Speicher auf diesem Gerät (Handy oder Browser). */
export const deviceStore: LocalStore = createLocalStore(AsyncStorage, { newId: randomUUID });
