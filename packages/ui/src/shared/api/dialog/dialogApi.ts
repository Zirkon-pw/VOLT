import type { DialogFileFilter } from './types';
import { getCurrentPlatformAdapter } from '@shared/platform';

export async function selectDirectory(): Promise<string> {
  return getCurrentPlatformAdapter().dialog.selectDirectory();
}

export async function pickImage(): Promise<string> {
  return getCurrentPlatformAdapter().dialog.pickImage();
}

export async function pickFiles(
  title: string,
  filters: DialogFileFilter[] = [],
  multiple = false,
): Promise<string[]> {
  return getCurrentPlatformAdapter().dialog.pickFiles(title, filters, multiple);
}
