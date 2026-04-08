/**
 * React Native platform adapter.
 *
 * Implements the PlatformAdapter contract for the mobile shell.
 * Most methods are stubs — replace with react-native-fs / expo-file-system /
 * @react-native-async-storage/async-storage as needed.
 */
import { Linking } from 'react-native';
import type {
  DialogFileFilter,
  FileEntry,
  PlatformAdapter,
  StorageEntry,
} from '../../../../common/types';

declare const __DEV__: boolean;

export const reactNativeAdapter: PlatformAdapter = {
  kind: 'mobile',

  capabilities: {
    localWorkspacePath: true,    // device filesystem accessible via RNFS
    process: false,              // no subprocess execution on mobile
    externalFilePick: true,      // document picker available
    embeddedDomEditor: true,     // WebView hosts the DOM editor
    multiWindow: false,
  },

  fs: {
    // TODO: replace with react-native-fs (RNFS) or expo-file-system
    async readFile(_workspaceLocator: string, _path: string): Promise<string> {
      throw new Error('fs.readFile: not yet implemented on mobile');
    },
    async writeFile(
      _workspaceLocator: string,
      _path: string,
      _content: string,
    ): Promise<void> {
      throw new Error('fs.writeFile: not yet implemented on mobile');
    },
    async listTree(
      _workspaceLocator: string,
      _path = '',
    ): Promise<FileEntry[]> {
      return [];
    },
    async createFile(
      _workspaceLocator: string,
      _path: string,
      _content?: string,
    ): Promise<void> {
      throw new Error('fs.createFile: not yet implemented on mobile');
    },
    async createDirectory(
      _workspaceLocator: string,
      _path: string,
    ): Promise<void> {
      throw new Error('fs.createDirectory: not yet implemented on mobile');
    },
    async deletePath(
      _workspaceLocator: string,
      _path: string,
    ): Promise<void> {
      throw new Error('fs.deletePath: not yet implemented on mobile');
    },
    async renamePath(
      _workspaceLocator: string,
      _oldPath: string,
      _newPath: string,
    ): Promise<void> {
      throw new Error('fs.renamePath: not yet implemented on mobile');
    },
  },

  dialog: {
    // TODO: replace with react-native-document-picker
    async selectDirectory() {
      throw new Error('dialog.selectDirectory: not yet implemented on mobile');
    },
    async pickImage() {
      throw new Error('dialog.pickImage: not yet implemented on mobile');
    },
    async pickFiles(
      _title: string,
      _filters: DialogFileFilter[] = [],
      _multiple = false,
    ): Promise<string[]> {
      throw new Error('dialog.pickFiles: not yet implemented on mobile');
    },
  },

  process: null, // process execution not supported on mobile

  storage: {
    // Returns a sentinel — no filesystem config directory on mobile
    async configDir() {
      return 'rn:storage';
    },
    // TODO: replace with @react-native-async-storage/async-storage
    async get<T>(_namespace: string, _key: string): Promise<T | null> {
      return null;
    },
    async set(
      _namespace: string,
      _key: string,
      _value: unknown,
    ): Promise<void> {
      throw new Error('storage.set: not yet implemented on mobile');
    },
    async delete(_namespace: string, _key: string): Promise<void> {
      throw new Error('storage.delete: not yet implemented on mobile');
    },
    async list<T>(_namespace: string): Promise<StorageEntry<T>[]> {
      return [];
    },
  },

  runtime: {
    platform: 'mobile',
    env: __DEV__ ? 'development' : 'production',
    openExternalUrl: (url: string) => {
      Linking.openURL(url).catch(() => {});
    },
  },
};
