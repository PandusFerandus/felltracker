import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { createLocalStore } from './storage';

/** Speicher auf diesem Gerät (Handy oder Browser). */
export const deviceStore = createLocalStore(AsyncStorage, { newId: randomUUID });
