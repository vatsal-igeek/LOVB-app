import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { TeamProvider } from '../contexts/TeamContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TeamProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/signin" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="home" />
          <Stack.Screen name="team-builder" />
          <Stack.Screen name="player-list" />
        </Stack>
      </TeamProvider>
    </AuthProvider>
  );
}
