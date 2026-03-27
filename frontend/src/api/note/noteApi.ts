import type { FileEntry } from './types';
import {
  ReadNote,
  SaveNote,
  ListTree,
  CreateNote,
  CreateDirectory,
  DeleteNote,
  RenameNote,
} from '../../../wailsjs/go/wailshandler/NoteHandler';

export async function readNote(voltPath: string, filePath: string): Promise<string> {
  return ReadNote(voltPath, filePath);
}

export async function saveNote(voltPath: string, filePath: string, content: string): Promise<void> {
  return SaveNote(voltPath, filePath, content);
}

export async function listTree(voltPath: string, dirPath: string = ''): Promise<FileEntry[]> {
  return ListTree(voltPath, dirPath);
}

export async function createNote(voltPath: string, filePath: string): Promise<void> {
  return CreateNote(voltPath, filePath);
}

export async function createDirectory(voltPath: string, dirPath: string): Promise<void> {
  return CreateDirectory(voltPath, dirPath);
}

export async function deleteNote(voltPath: string, filePath: string): Promise<void> {
  return DeleteNote(voltPath, filePath);
}

export async function renameNote(voltPath: string, oldPath: string, newPath: string): Promise<void> {
  return RenameNote(voltPath, oldPath, newPath);
}
