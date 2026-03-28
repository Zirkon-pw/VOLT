import type { PluginInfo } from './types';

export async function listPlugins(): Promise<PluginInfo[]> {
  const mod = await import('../../../wailsjs/go/wailshandler/PluginHandler');
  return mod.ListPlugins();
}

export async function loadPluginSource(pluginId: string): Promise<string> {
  const mod = await import('../../../wailsjs/go/wailshandler/PluginHandler');
  return mod.LoadPluginSource(pluginId);
}

export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  const mod = await import('../../../wailsjs/go/wailshandler/PluginHandler');
  return mod.SetPluginEnabled(pluginId, enabled);
}

export async function getPluginData(pluginId: string, key: string): Promise<string> {
  const mod = await import('../../../wailsjs/go/wailshandler/PluginHandler');
  return mod.GetPluginData(pluginId, key);
}

export async function setPluginData(pluginId: string, key: string, value: string): Promise<void> {
  const mod = await import('../../../wailsjs/go/wailshandler/PluginHandler');
  return mod.SetPluginData(pluginId, key, value);
}
