import React, { forwardRef, useCallback } from 'react';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';

import {
  IS_DEV,
  VOLT_NATIVE_INJECTED_JAVASCRIPT,
} from '../mobileShellConfig';
import { shellStyles } from '../mobileShellStyles';

interface VoltWebViewProps {
  serverUrl: string;
  webViewKey: number;
  onLoadStart: () => void;
  onLoad: () => void;
  onError: (event: WebViewErrorEvent) => void;
  onHttpError: (event: WebViewHttpErrorEvent) => void;
  onNavigationStateChange: (navigation: WebViewNavigation) => void;
}

export const VoltWebView = forwardRef<WebView, VoltWebViewProps>(
  function VoltWebView(
    {
      serverUrl,
      webViewKey,
      onLoadStart,
      onLoad,
      onError,
      onHttpError,
      onNavigationStateChange,
    },
    ref,
  ) {
    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      if (IS_DEV) {
        console.log('[WebView]', event.nativeEvent.data);
      }
    }, []);

    return (
      <WebView
        key={webViewKey}
        ref={ref}
        source={{ uri: serverUrl }}
        style={shellStyles.webview}
        onLoadStart={onLoadStart}
        onLoad={onLoad}
        onError={onError}
        onHttpError={onHttpError}
        onNavigationStateChange={onNavigationStateChange}
        injectedJavaScript={VOLT_NATIVE_INJECTED_JAVASCRIPT}
        injectedJavaScriptBeforeContentLoaded={
          VOLT_NATIVE_INJECTED_JAVASCRIPT
        }
        mixedContentMode="always"
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        onMessage={IS_DEV ? handleMessage : undefined}
      />
    );
  },
);
