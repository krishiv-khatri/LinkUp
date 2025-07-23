import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Authentication routing is now handled by the root index.tsx
  // This layout only renders when user is not authenticated or is in onboarding

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