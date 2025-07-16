import { useAuth } from '@/contexts/AuthContext';
import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingFlow = segments[1]?.startsWith('onboarding');
    
    // Check if user has completed onboarding (has username or displayName)
    const hasCompletedOnboarding = user && (user.username || user.displayName);
    
    if (user && !inAuthGroup && !inOnboardingFlow) {
      // User is authenticated but not in auth group or onboarding - redirect to main app
      router.replace('/');
    } else if (user && inAuthGroup && !inOnboardingFlow && segments[1] !== 'onboarding') {
      // User is authenticated and in auth group but not in onboarding flow
      if (segments[1] === 'sign-in') {
        // If they're on sign-in page while authenticated, redirect to main app
        router.replace('/');
      } else if (segments[1] === 'sign-up') {
        // If they're on sign-up page while authenticated
        if (hasCompletedOnboarding) {
          // If they've completed onboarding, redirect to main app
          router.replace('/');
        }
        // Otherwise, let them continue to onboarding from sign-up
      }
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="onboarding-profile" />
      <Stack.Screen name="onboarding-picture" />
      <Stack.Screen name="onboarding-birthday" />
      <Stack.Screen name="onboarding-socials" />
    </Stack>
  );
} 