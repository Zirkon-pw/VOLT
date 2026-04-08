import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, shellStyles } from '../mobileShellStyles';

interface ErrorScreenProps {
  url: string;
  onRetry: () => void;
  onConfigure: () => void;
}

export function ErrorScreen({
  url,
  onRetry,
  onConfigure,
}: ErrorScreenProps) {
  return (
    <View style={[StyleSheet.absoluteFill, shellStyles.overlay]}>
      <Text style={shellStyles.errorIcon}>⚠️</Text>
      <Text style={[shellStyles.h2, { color: palette.text }]}>
        Cannot connect to Volt
      </Text>
      <Text style={[shellStyles.body, { color: palette.textSecondary }]}>
        The server is unreachable at:
      </Text>
      <Text style={[shellStyles.url, { color: palette.accent }]}>{url}</Text>
      <Text style={[shellStyles.hint, { color: palette.textSecondary }]}>
        Run <Text style={{ color: palette.text }}>make dev-web</Text> on your
        Mac/PC and make sure this device is on the same network.
        {'\n'}Use your machine's local IP instead of localhost.
      </Text>
      <Pressable
        style={[shellStyles.btn, { backgroundColor: palette.accent }]}
        onPress={onRetry}
      >
        <Text style={shellStyles.btnText}>Retry</Text>
      </Pressable>
      <Pressable
        style={[shellStyles.btnGhost, { borderColor: palette.border }]}
        onPress={onConfigure}
      >
        <Text style={[shellStyles.btnText, { color: palette.text }]}>
          Change server URL
        </Text>
      </Pressable>
    </View>
  );
}
