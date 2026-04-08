import React from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ConfigureScreen } from './components/ConfigureScreen';
import { ErrorScreen } from './components/ErrorScreen';
import { LoadingOverlay } from './components/LoadingOverlay';
import { VoltWebView } from './components/VoltWebView';
import { useWebShellController } from './hooks/useWebShellController';
import { palette, shellStyles } from './mobileShellStyles';

export default function App() {
  const {
    closeConfigure,
    handleHttpError,
    handleLoad,
    handleLoadStart,
    handleNavigationChange,
    handleRetry,
    handleSaveUrl,
    handleWebViewError,
    openConfigure,
    overlay,
    serverUrl,
    webViewKey,
    webViewRef,
  } = useWebShellController();

  return (
    <SafeAreaView style={shellStyles.root}>
      <StatusBar style="light" backgroundColor={palette.bg} />

      {/*
        WebView is ALWAYS mounted and visible in the layout tree.
        Other screens are rendered as overlays instead of replacing it.
      */}
      <VoltWebView
        ref={webViewRef}
        serverUrl={serverUrl}
        webViewKey={webViewKey}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        onError={handleWebViewError}
        onHttpError={handleHttpError}
        onNavigationStateChange={handleNavigationChange}
      />

      <LoadingOverlay visible={overlay === 'loading'} />

      {overlay === 'error' && (
        <ErrorScreen
          url={serverUrl}
          onRetry={handleRetry}
          onConfigure={openConfigure}
        />
      )}

      {overlay === 'configure' && (
        <ConfigureScreen
          currentUrl={serverUrl}
          onSave={handleSaveUrl}
          onCancel={closeConfigure}
        />
      )}
    </SafeAreaView>
  );
}
