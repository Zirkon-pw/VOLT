import type { VoltPluginAPI } from './pluginApi';
import { registerCommand, registerSidebarPanel } from './pluginRegistry';
import { readNote, saveNote, listTree } from '@api/note';
import { getPluginData, setPluginData } from '@api/plugin';

export function createPluginAPI(pluginId: string, voltPath: string): VoltPluginAPI {
  return {
    volt: {
      async read(path: string): Promise<string> {
        return readNote(voltPath, path);
      },
      async write(path: string, content: string): Promise<void> {
        return saveNote(voltPath, path, content);
      },
      async list(dirPath?: string): Promise<unknown[]> {
        return listTree(voltPath, dirPath ?? '');
      },
      getActivePath(): string | null {
        return null;
      },
    },
    ui: {
      registerSidebarPanel(config) {
        registerSidebarPanel({
          id: `${pluginId}:${config.id}`,
          title: config.title,
          render: config.render,
        });
      },
      registerCommand(config) {
        registerCommand({
          id: `${pluginId}:${config.id}`,
          name: config.name,
          hotkey: config.hotkey,
          callback: config.callback,
        });
      },
      showNotice(message: string, _durationMs?: number) {
        console.log(`[plugin:${pluginId}] ${message}`);
      },
    },
    editor: {
      getContent(): string | null {
        return null;
      },
      insertAtCursor(_text: string): void {
        // stub — will be wired to editor instance later
      },
    },
    events: {
      on(_event: string, _callback: (...args: unknown[]) => void): () => void {
        // stub — event system to be implemented
        return () => {};
      },
    },
    storage: {
      async get(key: string): Promise<unknown> {
        const raw = await getPluginData(pluginId, key);
        if (!raw) return undefined;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      },
      async set(key: string, value: unknown): Promise<void> {
        await setPluginData(pluginId, key, JSON.stringify(value));
      },
    },
  };
}
