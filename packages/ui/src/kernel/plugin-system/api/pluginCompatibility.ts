import type { CapabilityKey, PluginCompatibility } from '@common/types';
import { getCurrentPlatformAdapter } from '@shared/platform';
import type { PluginManifest } from './pluginTypes';

function hasCapability(capability: CapabilityKey): boolean {
  const adapter = getCurrentPlatformAdapter();
  return adapter.capabilities[capability];
}

export function resolvePluginCompatibility(manifest: PluginManifest): PluginCompatibility {
  const adapter = getCurrentPlatformAdapter();

  if (manifest.platforms?.length && !manifest.platforms.includes(adapter.kind)) {
    return {
      supported: false,
      reason: `Unsupported on ${adapter.kind}`,
    };
  }

  const missingCapabilities = (manifest.requiredCapabilities ?? []).filter((capability) => !hasCapability(capability));
  if (manifest.permissions.includes('process') && !adapter.capabilities.process && !missingCapabilities.includes('process')) {
    missingCapabilities.push('process');
  }

  if (missingCapabilities.length > 0) {
    return {
      supported: false,
      reason: `Missing capabilities: ${missingCapabilities.join(', ')}`,
      missingCapabilities,
    };
  }

  return {
    supported: true,
    missingCapabilities: [],
  };
}
