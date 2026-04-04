export type WindowKind = 'main' | 'detached-file' | 'detached-sidebar';

export type DetachedTarget = 'file' | 'sidebar';

export interface WindowPayload {
  windowId: string;
  kind: WindowKind;
  voltId: string;
  voltPath: string;
  tabId?: string;
  filePath?: string;
  panelId?: string;
  openerWindowId?: string;
}
