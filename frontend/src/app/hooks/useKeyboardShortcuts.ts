import { useEffect } from 'react';
import { useTabStore } from '@app/stores/tabStore';
import { saveNote } from '@api/note/noteApi';
import { createNote } from '@api/note/noteApi';

interface UseKeyboardShortcutsOptions {
  voltId: string;
  voltPath: string;
}

export function useKeyboardShortcuts({ voltId, voltPath }: UseKeyboardShortcutsOptions) {
  const getActiveTab = () => {
    const state = useTabStore.getState();
    const activeTabId = state.activeTabs[voltId] ?? null;
    if (!activeTabId) return null;
    const voltTabs = state.tabs[voltId] ?? [];
    return voltTabs.find((t) => t.id === activeTabId) ?? null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key) {
        case 's': {
          e.preventDefault();
          const tab = getActiveTab();
          if (tab && tab.type === 'file' && tab.filePath) {
            // Dispatch a custom event that the editor can listen to for saving
            window.dispatchEvent(new CustomEvent('volt:save-active-file'));
          }
          break;
        }
        case 'w': {
          e.preventDefault();
          const tab = getActiveTab();
          if (tab) {
            useTabStore.getState().closeTab(voltId, tab.id);
          }
          break;
        }
        case 'n': {
          e.preventDefault();
          const timestamp = Date.now();
          const filePath = `Untitled-${timestamp}.md`;
          createNote(voltPath, filePath).then(() => {
            useTabStore.getState().openTab(voltId, filePath, `Untitled-${timestamp}`);
          });
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voltId, voltPath]);
}
