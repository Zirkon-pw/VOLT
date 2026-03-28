export interface RegisteredCommand {
  id: string;
  name: string;
  hotkey?: string;
  callback: () => void;
}

export interface RegisteredSidebarPanel {
  id: string;
  title: string;
  render: (container: HTMLElement) => void;
}

let commands: RegisteredCommand[] = [];
let sidebarPanels: RegisteredSidebarPanel[] = [];

export function registerCommand(cmd: RegisteredCommand): void {
  commands.push(cmd);
}

export function getCommands(): RegisteredCommand[] {
  return [...commands];
}

export function registerSidebarPanel(panel: RegisteredSidebarPanel): void {
  sidebarPanels.push(panel);
}

export function getSidebarPanels(): RegisteredSidebarPanel[] {
  return [...sidebarPanels];
}

export function clearAll(): void {
  commands = [];
  sidebarPanels = [];
}
