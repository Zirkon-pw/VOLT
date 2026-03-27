import type { SearchResult } from './types';

export async function searchFiles(voltPath: string, query: string): Promise<SearchResult[]> {
  const { SearchFiles } = await import('../../../wailsjs/go/wailshandler/SearchHandler');
  return SearchFiles(voltPath, query);
}
