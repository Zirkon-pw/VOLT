import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import { AppContent } from '@app/App';
import { AdapterProvider, webAdapter } from '@shared/platform';
import { checkSession } from './api/auth';
import { LoginScreen } from './components/LoginScreen';

const bootStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top, rgba(66, 106, 255, 0.16), transparent 45%), #f7f5ef',
    color: '#1f2430',
    fontFamily: '"Source Serif 4", Georgia, serif',
  },
  panel: {
    width: 'min(100%, 420px)',
    margin: '24px',
    padding: '28px 24px',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    boxShadow: '0 18px 48px rgba(27, 31, 59, 0.12)',
    border: '1px solid rgba(43, 55, 93, 0.08)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 1.55,
    color: '#4d5566',
  },
};

function BootScreen() {
  return (
    <div style={bootStyles.root}>
      <div style={bootStyles.panel}>
        <div style={bootStyles.title}>Volt запускается</div>
        <div style={bootStyles.text}>
          Проверяем сессию и поднимаем интерфейс. Если backend недоступен, экран входа откроется
          автоматически вместо пустого белого окна.
        </div>
      </div>
    </div>
  );
}

async function syncServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((cacheKey) => cacheKey.startsWith('volt-shell-'))
          .map((cacheKey) => caches.delete(cacheKey)),
      );
    }

    return;
  }

  await navigator.serviceWorker.register('/sw.js');
}

void syncServiceWorker().catch(() => {});

function AuthGate() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await checkSession();
        if (!cancelled) {
          setAuthenticated(status.authenticated);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!authChecked) {
    return <BootScreen />;
  }

  if (!authenticated) {
    return (
      <LoginScreen
        onLogin={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AdapterProvider adapter={webAdapter}>
      <AppContent />
    </AdapterProvider>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
);
