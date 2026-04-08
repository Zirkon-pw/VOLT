import type { CapabilityKey, PlatformKind } from './platform';

export interface PluginCompatibility {
  supported: boolean;
  reason?: string;
  missingCapabilities?: CapabilityKey[];
}

export interface PluginPlatformManifest {
  platforms?: PlatformKind[];
  requiredCapabilities?: CapabilityKey[];
}
