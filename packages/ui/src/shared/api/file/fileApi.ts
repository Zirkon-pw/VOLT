import type { FileEntry } from './types';
import { getCurrentPlatformAdapter } from '@shared/platform';

function ensureMarkdownPath(filePath: string): string {
  const trimmed = filePath.trim();
  return /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

export async function readFile(workspaceLocator: string, path: string): Promise<string> {
  return getCurrentPlatformAdapter().fs.readFile(workspaceLocator, path);
}

export async function writeFile(workspaceLocator: string, path: string, content: string): Promise<void> {
  return getCurrentPlatformAdapter().fs.writeFile(workspaceLocator, path, content);
}

export async function listTree(workspaceLocator: string, path: string = ''): Promise<FileEntry[]> {
  return getCurrentPlatformAdapter().fs.listTree(workspaceLocator, path);
}

export async function createFile(workspaceLocator: string, path: string, content = ''): Promise<void> {
  return getCurrentPlatformAdapter().fs.createFile(workspaceLocator, path, content);
}

export async function createMarkdownFile(workspaceLocator: string, path: string, content = ''): Promise<void> {
  return createFile(workspaceLocator, ensureMarkdownPath(path), content);
}

export async function createDirectory(workspaceLocator: string, path: string): Promise<void> {
  return getCurrentPlatformAdapter().fs.createDirectory(workspaceLocator, path);
}

export async function deletePath(workspaceLocator: string, path: string): Promise<void> {
  return getCurrentPlatformAdapter().fs.deletePath(workspaceLocator, path);
}

export async function renamePath(workspaceLocator: string, oldPath: string, newPath: string): Promise<void> {
  return getCurrentPlatformAdapter().fs.renamePath(workspaceLocator, oldPath, newPath);
}
