import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import App from '@app/App';
import { installPlaywrightBootstrap } from '@pages/playwright/installPlaywrightBootstrap';
import { AdapterProvider } from '@shared/platform';
import { wailsAdapter } from './platform/adapters/wails';

interface HostShellInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function normalizeStartupPath() {
  const { pathname, search, hash } = window.location;
  if (pathname === '/index.html') {
    window.history.replaceState(window.history.state, '', `/${search}${hash}`);
  }
}

function resolveHostShellInsets(): HostShellInsets {
  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? '';

  if (/mac/i.test(platform)) {
    return {
      top: 14,
      right: 0,
      bottom: 0,
      left: 78,
    };
  }

  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
}

function installHostShellInsets() {
  (window as Window & { __voltShellInsets?: HostShellInsets }).__voltShellInsets = resolveHostShellInsets();
}

normalizeStartupPath();
installHostShellInsets();

if (import.meta.env.DEV && window.location.pathname.startsWith('/__playwright__/')) {
  installPlaywrightBootstrap();
}

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <AdapterProvider adapter={wailsAdapter}>
      <App />
    </AdapterProvider>
  </React.StrictMode>
);
