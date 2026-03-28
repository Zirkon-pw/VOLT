export interface VoltPluginAPI {
  volt: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    list(dirPath?: string): Promise<unknown[]>;
    getActivePath(): string | null;
  };
  ui: {
    registerSidebarPanel(config: {
      id: string;
      title: string;
      render: (container: HTMLElement) => void;
    }): void;
    registerCommand(config: {
      id: string;
      name: string;
      hotkey?: string;
      callback: () => void;
    }): void;
    showNotice(message: string, durationMs?: number): void;
  };
  editor: {
    getContent(): string | null;
    insertAtCursor(text: string): void;
  };
  events: {
    on(event: string, callback: (...args: unknown[]) => void): () => void;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
}
