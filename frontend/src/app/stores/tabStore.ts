import { create } from 'zustand';

export type TabType = 'file' | 'graph';

export interface FileTab {
  id: string;
  type: TabType;
  filePath: string;
  fileName: string;
  isDirty: boolean;
}

interface TabState {
  tabs: Record<string, FileTab[]>;
  activeTabs: Record<string, string | null>;
  openTab: (voltId: string, filePath: string, fileName: string) => void;
  openGraphTab: (voltId: string) => void;
  closeTab: (voltId: string, tabId: string) => void;
  setActiveTab: (voltId: string, tabId: string) => void;
  setDirty: (voltId: string, tabId: string, dirty: boolean) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: {},
  activeTabs: {},

  openTab: (voltId, filePath, fileName) => {
    const { tabs, activeTabs } = get();
    const voltTabs = tabs[voltId] ?? [];
    const exists = voltTabs.find((t) => t.id === filePath);

    if (exists) {
      set({ activeTabs: { ...activeTabs, [voltId]: filePath } });
    } else {
      const newTab: FileTab = { id: filePath, type: 'file', filePath, fileName, isDirty: false };
      set({
        tabs: { ...tabs, [voltId]: [...voltTabs, newTab] },
        activeTabs: { ...activeTabs, [voltId]: filePath },
      });
    }
  },

  openGraphTab: (voltId) => {
    const GRAPH_TAB_ID = '__graph__';
    const { tabs, activeTabs } = get();
    const voltTabs = tabs[voltId] ?? [];
    const exists = voltTabs.find((t) => t.id === GRAPH_TAB_ID);

    if (exists) {
      set({ activeTabs: { ...activeTabs, [voltId]: GRAPH_TAB_ID } });
    } else {
      const newTab: FileTab = {
        id: GRAPH_TAB_ID,
        type: 'graph',
        filePath: '',
        fileName: 'Graph',
        isDirty: false,
      };
      set({
        tabs: { ...tabs, [voltId]: [...voltTabs, newTab] },
        activeTabs: { ...activeTabs, [voltId]: GRAPH_TAB_ID },
      });
    }
  },

  closeTab: (voltId, tabId) => {
    const { tabs, activeTabs } = get();
    const voltTabs = tabs[voltId] ?? [];
    const idx = voltTabs.findIndex((t) => t.id === tabId);
    const filtered = voltTabs.filter((t) => t.id !== tabId);

    let newActive = activeTabs[voltId];
    if (newActive === tabId) {
      if (filtered.length > 0) {
        const newIdx = Math.min(idx, filtered.length - 1);
        newActive = filtered[newIdx].id;
      } else {
        newActive = null;
      }
    }

    set({
      tabs: { ...tabs, [voltId]: filtered },
      activeTabs: { ...activeTabs, [voltId]: newActive },
    });
  },

  setActiveTab: (voltId, tabId) => {
    const { activeTabs } = get();
    set({ activeTabs: { ...activeTabs, [voltId]: tabId } });
  },

  setDirty: (voltId, tabId, dirty) => {
    const { tabs } = get();
    const voltTabs = tabs[voltId] ?? [];
    set({
      tabs: {
        ...tabs,
        [voltId]: voltTabs.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t)),
      },
    });
  },
}));
