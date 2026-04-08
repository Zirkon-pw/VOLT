import type {
  DialogFileFilter,
  FileEntry,
  PlatformAdapter,
  StorageEntry,
  WorkspaceCreateResult,
} from '@common/types';

export class PlatformNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PlatformNetworkError';
  }
}

interface JsonRequestInit extends RequestInit {
  body?: string;
}

async function requestJson<T>(path: string, init?: JsonRequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new PlatformNetworkError('Network request failed', { cause: error });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestVoid(path: string, init?: JsonRequestInit): Promise<void> {
  await requestJson<undefined>(path, init);
}

function pickFileViaInput(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;

    input.addEventListener('change', () => {
      settled = true;
      const files = Array.from(input.files ?? []);
      document.body.removeChild(input);
      resolve(files);
    });

    input.addEventListener('cancel', () => {
      settled = true;
      document.body.removeChild(input);
      reject(new Error('File selection cancelled'));
    });

    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          document.body.removeChild(input);
          reject(new Error('File selection cancelled'));
        }
      }, 300);
    }, { once: true });

    input.click();
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function createWebAdapter(apiBasePath = '/api'): PlatformAdapter {
  return {
    kind: 'web',
    capabilities: {
      localWorkspacePath: false,
      process: false,
      externalFilePick: false,
      embeddedDomEditor: true,
      multiWindow: false,
    },
    fs: {
      readFile(workspaceLocator: string, path: string): Promise<string> {
        return requestJson<{ content: string }>(
          `${apiBasePath}/files/read?workspaceId=${encodeURIComponent(workspaceLocator)}&path=${encodeURIComponent(path)}`,
        ).then((data) => data.content);
      },
      writeFile(workspaceLocator: string, path: string, content: string): Promise<void> {
        return requestVoid(`${apiBasePath}/files/write`, {
          method: 'POST',
          body: JSON.stringify({ workspaceId: workspaceLocator, path, content }),
        });
      },
      listTree(workspaceLocator: string, path = ''): Promise<FileEntry[]> {
        return requestJson<{ entries: FileEntry[] }>(
          `${apiBasePath}/files/tree?workspaceId=${encodeURIComponent(workspaceLocator)}&path=${encodeURIComponent(path)}`,
        ).then((data) => data.entries);
      },
      createFile(workspaceLocator: string, path: string, content = ''): Promise<void> {
        return requestVoid(`${apiBasePath}/files/create`, {
          method: 'POST',
          body: JSON.stringify({ workspaceId: workspaceLocator, path, content }),
        });
      },
      createDirectory(workspaceLocator: string, path: string): Promise<void> {
        return requestVoid(`${apiBasePath}/files/directory`, {
          method: 'POST',
          body: JSON.stringify({ workspaceId: workspaceLocator, path }),
        });
      },
      deletePath(workspaceLocator: string, path: string): Promise<void> {
        return requestVoid(`${apiBasePath}/files/delete`, {
          method: 'POST',
          body: JSON.stringify({ workspaceId: workspaceLocator, path }),
        });
      },
      renamePath(workspaceLocator: string, oldPath: string, newPath: string): Promise<void> {
        return requestVoid(`${apiBasePath}/files/rename`, {
          method: 'POST',
          body: JSON.stringify({ workspaceId: workspaceLocator, oldPath, newPath }),
        });
      },
    },
    dialog: {
      async selectDirectory(): Promise<string> {
        throw new Error(
          'Directory selection is not available on web. Use the workspace API to manage workspaces.',
        );
      },
      async pickImage(): Promise<string> {
        const files = await pickFileViaInput('image/*', false);
        if (files.length === 0) {
          throw new Error('No image selected');
        }
        return fileToDataUrl(files[0]);
      },
      async pickFiles(_title: string, filters: DialogFileFilter[] = [], multiple = false): Promise<string[]> {
        const accept = filters.map((f) => f.pattern).join(',');
        const files = await pickFileViaInput(accept, multiple);
        return Promise.all(files.map(fileToDataUrl));
      },
    },
    process: null,
    storage: {
      get<T>(namespace: string, key: string): Promise<T | null> {
        return requestJson<{ value: T | null }>(
          `${apiBasePath}/storage/get?namespace=${encodeURIComponent(namespace)}&key=${encodeURIComponent(key)}`,
        ).then((data) => data.value);
      },
      async configDir(): Promise<string> {
        return 'web:storage';
      },
      set(namespace: string, key: string, value: unknown): Promise<void> {
        return requestVoid(`${apiBasePath}/storage/set`, {
          method: 'POST',
          body: JSON.stringify({ namespace, key, value }),
        });
      },
      delete(namespace: string, key: string): Promise<void> {
        return requestVoid(`${apiBasePath}/storage/delete`, {
          method: 'POST',
          body: JSON.stringify({ namespace, key }),
        });
      },
      list<T>(namespace: string): Promise<StorageEntry<T>[]> {
        return requestJson<{ entries: StorageEntry<T>[] }>(
          `${apiBasePath}/storage/list?namespace=${encodeURIComponent(namespace)}`,
        ).then((data) => data.entries);
      },
    },
    runtime: {
      env: import.meta.env.DEV ? 'development' : 'production',
      platform: 'web',
      openExternalUrl(url: string): void {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    },
    async workspaceCreate(name: string, path: string): Promise<WorkspaceCreateResult> {
      const data = await requestJson<{ workspace: WorkspaceCreateResult }>(
        `${apiBasePath}/workspaces`,
        {
          method: 'POST',
          body: JSON.stringify({ name, path }),
        },
      );
      return data.workspace;
    },
  };
}

export const webAdapter = createWebAdapter();
