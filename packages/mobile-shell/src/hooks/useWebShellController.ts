import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { BackHandler, Platform } from 'react-native';
import {
  WebView,
  type WebViewNavigation,
} from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';

import {
  DEFAULT_SERVER_URL,
  buildDeepLinkTarget,
} from '../mobileShellConfig';

export type Overlay = 'loading' | 'error' | 'configure' | null;

export function useWebShellController() {
  const webViewRef = useRef<WebView>(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [overlay, setOverlay] = useState<Overlay>('loading');
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const remountWebView = useCallback(() => {
    setWebViewKey((currentKey) => currentKey + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setCanGoBack(false);
    setOverlay('loading');
    remountWebView();
  }, [remountWebView]);

  const handleSaveUrl = useCallback(
    (url: string) => {
      setServerUrl(url);
      setCanGoBack(false);
      setOverlay('loading');
      remountWebView();
    },
    [remountWebView],
  );

  const openConfigure = useCallback(() => {
    setOverlay('configure');
  }, []);

  const closeConfigure = useCallback(() => {
    setOverlay('error');
  }, []);

  const handleLoadStart = useCallback(() => {
    setOverlay('loading');
  }, []);

  const handleLoad = useCallback(() => {
    setOverlay(null);
  }, []);

  const handleWebViewError = useCallback((_event: WebViewErrorEvent) => {
    setCanGoBack(false);
    setOverlay('error');
  }, []);

  const handleHttpError = useCallback((event: WebViewHttpErrorEvent) => {
    if (event.nativeEvent.statusCode >= 500) {
      setCanGoBack(false);
      setOverlay('error');
    }
  }, []);

  const handleNavigationChange = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (overlay !== null) {
          return false;
        }

        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [canGoBack, overlay]);

  const handleDeepLink = useCallback(
    (url: string) => {
      const parsed = Linking.parse(url);
      if (!parsed.path || overlay !== null) {
        return;
      }

      const target = buildDeepLinkTarget(
        serverUrl,
        parsed.path,
        parsed.queryParams ?? undefined,
      );

      webViewRef.current?.injectJavaScript(
        `window.location.href=${JSON.stringify(target)};true;`,
      );
    },
    [overlay, serverUrl],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  return {
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
  };
}
