import { create } from 'zustand';
import type { WorkspaceRef } from '@common/types';

export type { WorkspaceRef };

interface WorkspaceState {
  workspaces: WorkspaceRef[];
  activeWorkspaceId: string | null;
  openWorkspace: (workspace: WorkspaceRef) => void;
  closeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  openWorkspace: (workspace) => {
    const { workspaces } = get();
    const exists = workspaces.find((w) => w.id === workspace.id);
    if (!exists) {
      set({ workspaces: [...workspaces, workspace], activeWorkspaceId: workspace.id });
    } else {
      set({ activeWorkspaceId: workspace.id });
    }
  },

  closeWorkspace: (id) => {
    const { workspaces, activeWorkspaceId } = get();
    const filtered = workspaces.filter((w) => w.id !== id);
    let newActive = activeWorkspaceId;
    if (activeWorkspaceId === id) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }
    set({ workspaces: filtered, activeWorkspaceId: newActive });
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
  },

  reorderWorkspaces: (fromIndex, toIndex) => {
    set((state) => {
      const updated = [...state.workspaces];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { workspaces: updated };
    });
  },
}));
