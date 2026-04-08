import { createContext, type ReactNode, useContext } from 'react';
import type {
  DialogAdapter,
  FileSystemAdapter,
  PlatformAdapter,
  ProcessAdapter,
  RuntimeAdapter,
  StorageAdapter,
} from '@common/types';

const AdapterContext = createContext<PlatformAdapter | null>(null);

let currentAdapter: PlatformAdapter | null = null;

function ensureAdapter(adapter: PlatformAdapter | null): PlatformAdapter {
  if (adapter) {
    return adapter;
  }

  throw new Error('Platform adapter is not configured');
}

export function setCurrentPlatformAdapter(adapter: PlatformAdapter): void {
  currentAdapter = adapter;
}

export function getCurrentPlatformAdapter(): PlatformAdapter {
  return ensureAdapter(currentAdapter);
}

interface AdapterProviderProps {
  adapter: PlatformAdapter;
  children: ReactNode;
}

export function AdapterProvider({ adapter, children }: AdapterProviderProps) {
  setCurrentPlatformAdapter(adapter);

  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
}

export function usePlatformAdapter(): PlatformAdapter {
  return ensureAdapter(useContext(AdapterContext) ?? currentAdapter);
}

export function useFileSystem(): FileSystemAdapter {
  return usePlatformAdapter().fs;
}

export function useDialog(): DialogAdapter {
  return usePlatformAdapter().dialog;
}

export function useStorage(): StorageAdapter {
  return usePlatformAdapter().storage;
}

export function useRuntime(): RuntimeAdapter {
  return usePlatformAdapter().runtime;
}

export function useProcess(): ProcessAdapter | null {
  return usePlatformAdapter().process;
}
