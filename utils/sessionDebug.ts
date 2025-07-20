import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

export const sessionDebug = {
  // Check if session is stored in SecureStore
  async checkStoredSession(): Promise<void> {
    try {
      console.log('🔍 Checking stored session...');
      
      // Check for Supabase session storage
      const sessionKey = 'sb-shrxvavaoijxtivhixfk-auth-token';
      const storedSession = await SecureStore.getItemAsync(sessionKey);
      
      if (storedSession) {
        console.log('✅ Session found in SecureStore');
        const sessionData = JSON.parse(storedSession);
        console.log('📅 Session expires at:', new Date(sessionData.expires_at * 1000).toISOString());
        console.log('👤 User ID:', sessionData.user?.id);
      } else {
        console.log('❌ No session found in SecureStore');
      }
      
      // Check current Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Supabase session is active');
        console.log('👤 Current user:', session.user.email);
      } else {
        console.log('❌ No active Supabase session');
      }
    } catch (error) {
      console.error('❌ Error checking stored session:', error);
    }
  },

  // Clear stored session (for testing)
  async clearStoredSession(): Promise<void> {
    try {
      const sessionKey = 'sb-shrxvavaoijxtivhixfk-auth-token';
      await SecureStore.deleteItemAsync(sessionKey);
      console.log('🧹 Stored session cleared');
    } catch (error) {
      console.error('❌ Error clearing stored session:', error);
    }
  },

  // List all keys in SecureStore (for debugging)
  async listSecureStoreKeys(): Promise<void> {
    try {
      console.log('🔍 Listing SecureStore keys...');
      // Note: SecureStore doesn't have a list method, so we'll check common Supabase keys
      const commonKeys = [
        'sb-shrxvavaoijxtivhixfk-auth-token',
        'supabase.auth.token',
        'supabase.auth.refreshToken'
      ];
      
      for (const key of commonKeys) {
        const value = await SecureStore.getItemAsync(key);
        if (value) {
          console.log(`✅ Found key: ${key}`);
        } else {
          console.log(`❌ Not found: ${key}`);
        }
      }
    } catch (error) {
      console.error('❌ Error listing SecureStore keys:', error);
    }
  }
}; 