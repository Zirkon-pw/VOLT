import type { GraphData } from './types';

export async function getGraph(voltPath: string): Promise<GraphData> {
  const { GetGraph } = await import('../../../wailsjs/go/wailshandler/GraphHandler');
  return GetGraph(voltPath);
}
