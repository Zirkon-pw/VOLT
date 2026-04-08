import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette, shellStyles } from '../mobileShellStyles';

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, shellStyles.overlay]}
      pointerEvents="none"
    >
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={shellStyles.loadingText}>Connecting…</Text>
    </View>
  );
}
