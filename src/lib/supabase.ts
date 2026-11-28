import './polyfills';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config';

export const supabase = createClient(SUPABASE_URL || 'https://invalid.local', SUPABASE_PUBLISHABLE_KEY || 'missing', {
  auth: {
    storage: AsyncStorage,
    storageKey: 'felltracker:auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Anmeldung nur erneuern, solange die App im Vordergrund ist.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
