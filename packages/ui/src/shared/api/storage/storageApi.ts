import type { StorageEntry } from './types';
import { getCurrentPlatformAdapter } from '@shared/platform';

export async function getStorageValue<T>(namespace: string, key: string): Promise<T | null> {
  return getCurrentPlatformAdapter().storage.get<T>(namespace, key);
}

export async function getStorageConfigDir(): Promise<string> {
  return getCurrentPlatformAdapter().storage.configDir();
}

export async function setStorageValue(namespace: string, key: string, value: unknown): Promise<void> {
  return getCurrentPlatformAdapter().storage.set(namespace, key, value);
}

export async function deleteStorageValue(namespace: string, key: string): Promise<void> {
  return getCurrentPlatformAdapter().storage.delete(namespace, key);
}

export async function listStorageValues<T>(namespace: string): Promise<StorageEntry<T>[]> {
  return getCurrentPlatformAdapter().storage.list<T>(namespace);
}

export async function clearStorageNamespace(namespace: string): Promise<void> {
  const entries = await listStorageValues(namespace);
  await Promise.all(entries.map((entry) => deleteStorageValue(namespace, entry.key)));
}
