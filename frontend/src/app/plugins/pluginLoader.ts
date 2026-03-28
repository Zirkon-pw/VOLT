import type { PluginInfo } from '@api/plugin';
import type { VoltPluginAPI } from './pluginApi';
import { listPlugins, loadPluginSource } from '@api/plugin';
import { createPluginAPI } from './pluginApiFactory';
import { clearAll } from './pluginRegistry';

export async function loadPlugin(pluginInfo: PluginInfo, api: VoltPluginAPI): Promise<void> {
  try {
    const source = await loadPluginSource(pluginInfo.manifest.id);
    const pluginFn = new Function('api', source);
    pluginFn(api);
  } catch (err) {
    console.error(`Failed to load plugin "${pluginInfo.manifest.id}":`, err);
  }
}

export async function loadAllPlugins(voltPath: string): Promise<void> {
  try {
    const plugins = await listPlugins();
    const enabled = plugins.filter((p) => p.enabled);

    for (const p of enabled) {
      const api = createPluginAPI(p.manifest.id, voltPath);
      await loadPlugin(p, api);
    }
  } catch (err) {
    console.error('Failed to load plugins:', err);
  }
}

export function unloadAllPlugins(): void {
  clearAll();
}
