export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  main: string;
  permissions: string[];
}

export interface PluginInfo {
  manifest: PluginManifest;
  enabled: boolean;
  dirPath: string;
}
