declare global {
  interface Window {
    runtime?: {
      BrowserOpenURL?: (url: string) => void;
    };
  }
}

export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.runtime?.BrowserOpenURL === 'function') {
    window.runtime.BrowserOpenURL(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
