export {
  AdapterProvider,
  getCurrentPlatformAdapter,
  setCurrentPlatformAdapter,
  useDialog,
  useFileSystem,
  usePlatformAdapter,
  useProcess,
  useRuntime,
  useStorage,
} from './adapter';
// wailsAdapter is desktop-specific — imported directly by the frontend/ shell, not re-exported here
export { createWebAdapter, webAdapter } from './adapters/web';
