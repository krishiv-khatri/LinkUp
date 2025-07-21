import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

export async function registerForPushNotificationsAsync(userId: string) {
  if (!userId) return;
  const alreadyAsked = await AsyncStorage.getItem('pushPermissionAsked');
  if (alreadyAsked) return; // Don't ask again

  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      await AsyncStorage.setItem('pushPermissionAsked', 'true');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo push token:', token);
    // Store token in Supabase for this user
    const { error } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
    if (error) {
      console.error('Failed to update expo_push_token:', error);
    }
    await AsyncStorage.setItem('pushPermissionAsked', 'true');
  }
  // Optionally handle web/unsupported
  return token;
} 