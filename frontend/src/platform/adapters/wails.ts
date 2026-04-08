import { dialog } from '@wailsjs/go/models';
import { process } from '@wailsjs/go/models';
import type {
  DialogFileFilter,
  FileEntry,
  PlatformAdapter,
  ProcessEventPayload,
  StorageEntry,
  StartProcessRequest,
} from '@common/types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';

const loadFileHandler = () => import('@wailsjs/go/wailshandler/FileHandler');
const loadDialogHandler = () => import('@wailsjs/go/wailshandler/DialogHandler');
const loadProcessHandler = () => import('@wailsjs/go/wailshandler/ProcessHandler');
const loadStorageHandler = () => import('@wailsjs/go/wailshandler/StorageHandler');

function toWailsFilter(filter: DialogFileFilter): dialog.FileFilter {
  return dialog.FileFilter.createFrom({
    DisplayName: filter.displayName,
    Pattern: filter.pattern,
  });
}

function toWailsRequest(request: StartProcessRequest): process.StartRequest {
  return process.StartRequest.createFrom({
    RunID: request.runId,
    VoltPath: request.workspaceLocator,
    Command: request.command,
    Args: request.args ?? [],
    Stdin: request.stdin ?? '',
    StdoutMode: request.stdoutMode ?? 'raw',
    StderrMode: request.stderrMode ?? 'raw',
    StartFailedMessage: request.startFailedMessage ?? 'Failed to start process.',
    StreamFailedMessage: request.streamFailedMessage ?? 'Failed to stream process output.',
    RunFailedMessage: request.runFailedMessage ?? 'Process finished with an error.',
  });
}

function decodeRawValue(raw: unknown): string {
  if (raw == null) {
    return '';
  }

  if (typeof raw === 'string') {
    return raw;
  }

  if (raw instanceof Uint8Array) {
    return new TextDecoder().decode(raw);
  }

  if (Array.isArray(raw) && raw.every((item) => typeof item === 'number')) {
    return new TextDecoder().decode(Uint8Array.from(raw));
  }

  return JSON.stringify(raw);
}

function parseStoredValue<T>(raw: unknown): T {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw) && !(raw instanceof Uint8Array)) {
    return raw as T;
  }

  const decoded = decodeRawValue(raw);
  if (!decoded) {
    return undefined as T;
  }

  return JSON.parse(decoded) as T;
}

function isMissingKeyError(error: unknown): boolean {
  return error instanceof Error && /key not found/i.test(error.message);
}

function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const runtime = (window as Window & {
    runtime?: {
      BrowserOpenURL?: (href: string) => void;
    };
  }).runtime;

  if (typeof runtime?.BrowserOpenURL === 'function') {
    runtime.BrowserOpenURL(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export const wailsAdapter: PlatformAdapter = {
  kind: 'desktop',
  capabilities: {
    localWorkspacePath: true,
    process: true,
    externalFilePick: true,
    embeddedDomEditor: true,
    multiWindow: true,
  },
  fs: {
    readFile(workspaceLocator: string, path: string): Promise<string> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.Read(workspaceLocator, path), 'readFile');
    },
    writeFile(workspaceLocator: string, path: string, content: string): Promise<void> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.Write(workspaceLocator, path, content), 'writeFile');
    },
    listTree(workspaceLocator: string, path = ''): Promise<FileEntry[]> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.ListTree(workspaceLocator, path), 'listTree');
    },
    createFile(workspaceLocator: string, path: string, content = ''): Promise<void> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.CreateFile(workspaceLocator, path, content), 'createFile');
    },
    createDirectory(workspaceLocator: string, path: string): Promise<void> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.CreateDirectory(workspaceLocator, path), 'createDirectory');
    },
    deletePath(workspaceLocator: string, path: string): Promise<void> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.Delete(workspaceLocator, path), 'deletePath');
    },
    renamePath(workspaceLocator: string, oldPath: string, newPath: string): Promise<void> {
      return invokeWailsSafe(loadFileHandler, (mod) => mod.Rename(workspaceLocator, oldPath, newPath), 'renamePath');
    },
  },
  dialog: {
    selectDirectory(): Promise<string> {
      return invokeWailsSafe(loadDialogHandler, (mod) => mod.SelectDirectory(), 'dialog.selectDirectory');
    },
    pickImage(): Promise<string> {
      return invokeWailsSafe(loadDialogHandler, (mod) => mod.PickImage(), 'dialog.pickImage');
    },
    pickFiles(title: string, filters: DialogFileFilter[] = [], multiple = false): Promise<string[]> {
      return invokeWailsSafe(
        loadDialogHandler,
        (mod) => mod.PickFiles(title, filters.map(toWailsFilter), multiple),
        'dialog.pickFiles',
      );
    },
  },
  process: {
    start(request: StartProcessRequest): Promise<void> {
      return invokeWailsSafe(
        loadProcessHandler,
        (mod) => mod.Start(toWailsRequest(request)),
        `process.start:${request.command}`,
      );
    },
    cancel(runId: string): Promise<void> {
      return invokeWailsSafe(loadProcessHandler, (mod) => mod.Cancel(runId), `process.cancel:${runId}`);
    },
    async onProcessEvent(callback: (payload: ProcessEventPayload) => void): Promise<() => void> {
      const { waitForWailsBridge } = await import('@shared/api/wails');
      await waitForWailsBridge();
      const { EventsOn } = await import('@wailsjs/runtime/runtime');
      return EventsOn('volt:plugin-process', callback);
    },
  },
  storage: {
    async get<T>(namespace: string, key: string): Promise<T | null> {
      try {
        const raw = await invokeWailsSafe(
          loadStorageHandler,
          (mod) => mod.Get(namespace, key),
          `storage.get:${namespace}:${key}`,
        );
        return parseStoredValue<T>(raw);
      } catch (error) {
        if (isMissingKeyError(error)) {
          return null;
        }

        throw error;
      }
    },
    configDir(): Promise<string> {
      return invokeWailsSafe(
        loadStorageHandler,
        (mod) => mod.ConfigDir(),
        'storage.configDir',
      );
    },
    set(namespace: string, key: string, value: unknown): Promise<void> {
      return invokeWailsSafe(
        loadStorageHandler,
        (mod) => mod.Set(namespace, key, value as never),
        `storage.set:${namespace}:${key}`,
      );
    },
    delete(namespace: string, key: string): Promise<void> {
      return invokeWailsSafe(
        loadStorageHandler,
        (mod) => mod.Delete(namespace, key),
        `storage.delete:${namespace}:${key}`,
      );
    },
    async list<T>(namespace: string): Promise<StorageEntry<T>[]> {
      const entries = await invokeWailsSafe(
        loadStorageHandler,
        (mod) => mod.List(namespace),
        `storage.list:${namespace}`,
      );

      return (entries as Array<{ key: string; value: unknown }>).map((entry) => ({
        key: entry.key,
        value: parseStoredValue<T>(entry.value),
      }));
    },
  },
  runtime: {
    env: import.meta.env.DEV ? 'development' : 'production',
    platform: 'desktop',
    openExternalUrl,
  },
};
