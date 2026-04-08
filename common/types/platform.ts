export type PlatformKind = 'desktop' | 'web' | 'mobile';

export interface PlatformCapabilities {
  localWorkspacePath: boolean;
  process: boolean;
  externalFilePick: boolean;
  embeddedDomEditor: boolean;
  multiWindow: boolean;
}

export type CapabilityKey = keyof PlatformCapabilities;

export interface WorkspaceDescriptor {
  id: string;
  displayName: string;
  rootPath?: string;
}

export interface WorkspaceRef {
  id: string;
  displayName: string;
  locator: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}

export interface DialogFileFilter {
  displayName: string;
  pattern: string;
}

export interface StorageEntry<T = unknown> {
  key: string;
  value: T;
}

export interface StartProcessRequest {
  runId: string;
  workspaceLocator: string;
  command: string;
  args?: string[];
  stdin?: string;
  stdoutMode?: 'raw' | 'lines';
  stderrMode?: 'raw' | 'lines';
  startFailedMessage?: string;
  streamFailedMessage?: string;
  runFailedMessage?: string;
}

export interface FileSystemAdapter {
  readFile(workspaceLocator: string, path: string): Promise<string>;
  writeFile(workspaceLocator: string, path: string, content: string): Promise<void>;
  listTree(workspaceLocator: string, path?: string): Promise<FileEntry[]>;
  createFile(workspaceLocator: string, path: string, content?: string): Promise<void>;
  createDirectory(workspaceLocator: string, path: string): Promise<void>;
  deletePath(workspaceLocator: string, path: string): Promise<void>;
  renamePath(workspaceLocator: string, oldPath: string, newPath: string): Promise<void>;
}

export interface DialogAdapter {
  selectDirectory(): Promise<string>;
  pickImage(): Promise<string>;
  pickFiles(title: string, filters?: DialogFileFilter[], multiple?: boolean): Promise<string[]>;
}

export interface ProcessEventPayload {
  runId: string;
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data?: string;
  code?: number;
  message?: string;
}

export interface ProcessAdapter {
  start(request: StartProcessRequest): Promise<void>;
  cancel(runId: string): Promise<void>;
  onProcessEvent(callback: (payload: ProcessEventPayload) => void): Promise<() => void>;
}

export interface StorageAdapter {
  get<T>(namespace: string, key: string): Promise<T | null>;
  configDir(): Promise<string>;
  set(namespace: string, key: string, value: unknown): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
  list<T>(namespace: string): Promise<StorageEntry<T>[]>;
}

export interface RuntimeAdapter {
  env: 'development' | 'production';
  platform: PlatformKind;
  openExternalUrl(url: string): void | Promise<void>;
}

export interface WorkspaceCreateResult {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

export interface PlatformAdapter {
  kind: PlatformKind;
  capabilities: PlatformCapabilities;
  fs: FileSystemAdapter;
  dialog: DialogAdapter;
  process: ProcessAdapter | null;
  storage: StorageAdapter;
  runtime: RuntimeAdapter;
  /**
   * Optional: platform-native workspace creation.
   * When present (e.g. web adapter), VaultManager delegates workspace
   * creation to this method instead of using the file + storage adapters
   * directly. The implementation is responsible for creating the directory
   * and persisting the workspace record.
   */
  workspaceCreate?: (name: string, path: string) => Promise<WorkspaceCreateResult>;
}
