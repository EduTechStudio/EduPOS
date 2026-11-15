import React from 'react';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Root layout already shows header, or maybe we want header here?
      }}
    />
  );
}
