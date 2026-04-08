import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function validatePluginManifest(manifest: unknown): manifest is PluginManifest {
  return (
    isObject(manifest) &&
    typeof manifest.apiVersion === 'number' &&
    typeof manifest.id === 'string' &&
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string' &&
    typeof manifest.main === 'string' &&
    Array.isArray(manifest.permissions) &&
    (manifest.platforms == null || (Array.isArray(manifest.platforms) && manifest.platforms.every((value) => typeof value === 'string'))) &&
    (manifest.requiredCapabilities == null || (Array.isArray(manifest.requiredCapabilities) && manifest.requiredCapabilities.every((value) => typeof value === 'string')))
  );
}
