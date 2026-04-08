import { getCurrentPlatformAdapter } from '@shared/platform';

export function openExternalUrl(url: string): void {
  void getCurrentPlatformAdapter().runtime.openExternalUrl(url);
}
