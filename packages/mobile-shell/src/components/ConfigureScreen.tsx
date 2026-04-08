import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { normalizeServerUrl } from '../mobileShellConfig';
import { palette, shellStyles } from '../mobileShellStyles';

interface ConfigureScreenProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onCancel?: () => void;
}

export function ConfigureScreen({
  currentUrl,
  onSave,
  onCancel,
}: ConfigureScreenProps) {
  const [value, setValue] = useState(currentUrl);

  useEffect(() => {
    setValue(currentUrl);
  }, [currentUrl]);

  const handleSave = () => {
    const normalizedUrl = normalizeServerUrl(value);
    if (!normalizedUrl) {
      return;
    }

    onSave(normalizedUrl);
  };

  return (
    <View style={[StyleSheet.absoluteFill, shellStyles.overlay]}>
      <View style={shellStyles.logoRow}>
        <View style={[shellStyles.logoBox, { backgroundColor: palette.accent }]}>
          <Text style={shellStyles.logoLetter}>V</Text>
        </View>
        <Text style={[shellStyles.h1, { color: palette.text }]}>Volt</Text>
      </View>
      <Text
        style={[
          shellStyles.body,
          { color: palette.textSecondary, marginBottom: 20 },
        ]}
      >
        Enter your Volt server address
      </Text>
      <TextInput
        style={[
          shellStyles.input,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        value={value}
        onChangeText={setValue}
        placeholder="http://192.168.1.100:8080"
        placeholderTextColor={palette.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={handleSave}
      />
      <Text style={[shellStyles.hint, { color: palette.textSecondary }]}>
        Run <Text style={{ color: palette.text }}>make dev-web</Text> to start
        the server.
        {'\n'}Use your machine's local IP, not localhost, on real devices.
      </Text>
      <Pressable
        style={[shellStyles.btn, { backgroundColor: palette.accent }]}
        onPress={handleSave}
      >
        <Text style={shellStyles.btnText}>Connect</Text>
      </Pressable>
      {onCancel ? (
        <Pressable
          style={[shellStyles.btnGhost, { borderColor: palette.border }]}
          onPress={onCancel}
        >
          <Text style={[shellStyles.btnText, { color: palette.text }]}>
            Cancel
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
