import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = 'https://shrxvavaoijxtivhixfk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocnh2YXZhb2lqeHRpdmhpeGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMDkyNjQsImV4cCI6MjA2NjY4NTI2NH0.DT3pqiD0lZslUpdNfUWU3K343sSPnXF1vnFcFiMXys4';

// Custom storage implementation for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Wrap fetch to log failing requests to help diagnose "Network request failed"
const loggingFetch = async (input: any, init?: any) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    try {
      const method = init?.method || 'GET';
      const url = typeof input === 'string' ? input : input?.url || String(input);
      // Keep the log concise to avoid flooding the console
      console.error('Network request failed:', method, url);
    } catch {}
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: loggingFetch,
  },
}); 