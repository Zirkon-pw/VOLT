import { buildWindowPayloadSearch } from './payload';
import type { WindowPayload } from './types';

const openWindowHandles = new Map<string, Window | null>();

function buildDetachedRoute(payload: WindowPayload): string {
  const route = payload.kind === 'detached-sidebar' ? '/window/sidebar' : '/window/file';
  const url = new URL(route, window.location.origin);
  url.search = buildWindowPayloadSearch(payload);
  return url.toString();
}

function openDetachedWindow(payload: WindowPayload, width: number, height: number): Window | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const handle = window.open(
    buildDetachedRoute(payload),
    payload.windowId,
    [
      'popup=yes',
      `width=${width}`,
      `height=${height}`,
      'noopener',
    ].join(','),
  );

  if (handle) {
    openWindowHandles.set(payload.windowId, handle);
    handle.focus();
  }

  return handle;
}

export const windowManager = {
  OpenDetachedFile(payload: WindowPayload): Window | null {
    return openDetachedWindow(payload, 1220, 860);
  },
  OpenDetachedSidebar(payload: WindowPayload): Window | null {
    return openDetachedWindow(payload, 420, 860);
  },
  DockWindow(windowId: string): void {
    const handle = openWindowHandles.get(windowId);
    handle?.close();
    openWindowHandles.delete(windowId);
  },
  FocusWindow(windowId: string): void {
    openWindowHandles.get(windowId)?.focus();
  },
  RestoreToMain(windowId: string): void {
    const handle = openWindowHandles.get(windowId);
    handle?.focus();
    handle?.close();
    openWindowHandles.delete(windowId);
  },
};
