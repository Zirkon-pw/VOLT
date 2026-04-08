import type { StartProcessRequest } from './types';
import { getCurrentPlatformAdapter } from '@shared/platform';

export async function startProcess(request: StartProcessRequest): Promise<void> {
  const adapter = getCurrentPlatformAdapter();
  if (!adapter.process) {
    throw new Error(`Process execution is not supported on ${adapter.kind}`);
  }

  return adapter.process.start(request);
}

export async function cancelProcess(runId: string): Promise<void> {
  const adapter = getCurrentPlatformAdapter();
  if (!adapter.process) {
    throw new Error(`Process execution is not supported on ${adapter.kind}`);
  }

  return adapter.process.cancel(runId);
}
