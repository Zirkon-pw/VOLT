import { Platform } from 'react-native';

declare const __DEV__: boolean;

type QueryValue = string | string[] | undefined;

export const IS_DEV = __DEV__;

export const DEFAULT_SERVER_URL = IS_DEV
  ? 'http://localhost:5174'
  : 'http://localhost:8080';

export const VOLT_NATIVE_INJECTED_JAVASCRIPT = `
  (function () {
    window.__voltNative = { platform: 'mobile', os: '${Platform.OS}' };
  })();
  true;
`;

export function normalizeServerUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function buildDeepLinkTarget(
  baseUrl: string,
  path: string,
  queryParams?: Record<string, QueryValue>,
): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, '');

  try {
    const target = new URL(normalizedPath, normalizedBase);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) {
          for (const entry of value) {
            target.searchParams.append(key, entry);
          }
          continue;
        }

        if (typeof value === 'string') {
          target.searchParams.set(key, value);
        }
      }
    }

    return target.toString();
  } catch {
    const base = normalizedBase.replace(/\/+$/, '');
    const nextPath = normalizedPath.replace(/^\/+/, '');
    return nextPath ? `${base}/${nextPath}` : base;
  }
}
