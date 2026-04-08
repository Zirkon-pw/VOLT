import type { WindowPayload, WindowKind } from './types';

const PAYLOAD_QUERY_KEY = 'payload';

function isWindowKind(value: string): value is WindowKind {
  return value === 'main' || value === 'detached-file' || value === 'detached-sidebar';
}

function isWindowPayload(value: unknown): value is WindowPayload {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.windowId === 'string'
    && isWindowKind(String(payload.kind ?? ''))
    && typeof payload.voltId === 'string'
    && typeof payload.locator === 'string'
  );
}

export function encodeWindowPayload(payload: WindowPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeWindowPayload(encodedPayload: string | null | undefined): WindowPayload | null {
  if (!encodedPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedPayload)) as unknown;
    return isWindowPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildWindowPayloadSearch(payload: WindowPayload): string {
  const search = new URLSearchParams();
  search.set(PAYLOAD_QUERY_KEY, encodeWindowPayload(payload));
  return search.toString();
}

export function readWindowPayloadFromSearch(search: string): WindowPayload | null {
  const params = new URLSearchParams(search);
  return decodeWindowPayload(params.get(PAYLOAD_QUERY_KEY));
}
