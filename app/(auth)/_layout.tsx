import { Stack } from 'expo-router';
import React from 'react';
import NeonBallsBackground from './NeonBallsBackground';

export default function AuthLayout() {
  return (
    <>
      <NeonBallsBackground />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
} 