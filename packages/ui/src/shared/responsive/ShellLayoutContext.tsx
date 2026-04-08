import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ShellLayoutMode = 'mobile' | 'compact' | 'desktop';

interface HostShellInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ShellLayoutValue {
  mode: ShellLayoutMode;
  isCoarsePointer: boolean;
  isTouchUi: boolean;
  viewportWidth: number;
}

declare global {
  interface Window {
    __voltShellInsets?: Partial<HostShellInsets>;
  }
}

const MOBILE_MAX_WIDTH = 820;
const COMPACT_MAX_WIDTH = 1024;

const defaultValue: ShellLayoutValue = {
  mode: 'desktop',
  isCoarsePointer: false,
  isTouchUi: false,
  viewportWidth: 1280,
};

const defaultHostInsets: HostShellInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const ShellLayoutContext = createContext<ShellLayoutValue>(defaultValue);

function resolveMode(viewportWidth: number): ShellLayoutMode {
  if (viewportWidth <= MOBILE_MAX_WIDTH) {
    return 'mobile';
  }

  if (viewportWidth <= COMPACT_MAX_WIDTH) {
    return 'compact';
  }

  return 'desktop';
}

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return defaultValue.viewportWidth;
  }

  return window.innerWidth;
}

function getIsCoarsePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(pointer: coarse)').matches;
}

function getLayoutSnapshot(): ShellLayoutValue {
  const viewportWidth = getViewportWidth();
  const isCoarsePointer = getIsCoarsePointer();
  const mode = resolveMode(viewportWidth);

  return {
    mode,
    isCoarsePointer,
    isTouchUi: mode === 'mobile' || isCoarsePointer,
    viewportWidth,
  };
}

function toInsetValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function getHostShellInsets(): HostShellInsets {
  if (typeof window === 'undefined') {
    return defaultHostInsets;
  }

  return {
    top: toInsetValue(window.__voltShellInsets?.top),
    right: toInsetValue(window.__voltShellInsets?.right),
    bottom: toInsetValue(window.__voltShellInsets?.bottom),
    left: toInsetValue(window.__voltShellInsets?.left),
  };
}

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<ShellLayoutValue>(() => getLayoutSnapshot());

  useEffect(() => {
    const updateLayout = () => {
      setLayout(getLayoutSnapshot());
    };

    const coarsePointerQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;

    updateLayout();
    window.addEventListener('resize', updateLayout);
    coarsePointerQuery?.addEventListener?.('change', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      coarsePointerQuery?.removeEventListener?.('change', updateLayout);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const hostInsets = getHostShellInsets();
    root.dataset.shellLayout = layout.mode;
    root.dataset.shellPointer = layout.isTouchUi ? 'touch' : 'fine';
    root.style.setProperty('--host-shell-inset-top', `${hostInsets.top}px`);
    root.style.setProperty('--host-shell-inset-right', `${hostInsets.right}px`);
    root.style.setProperty('--host-shell-inset-bottom', `${hostInsets.bottom}px`);
    root.style.setProperty('--host-shell-inset-left', `${hostInsets.left}px`);

    return () => {
      delete root.dataset.shellLayout;
      delete root.dataset.shellPointer;
      root.style.removeProperty('--host-shell-inset-top');
      root.style.removeProperty('--host-shell-inset-right');
      root.style.removeProperty('--host-shell-inset-bottom');
      root.style.removeProperty('--host-shell-inset-left');
    };
  }, [layout.isTouchUi, layout.mode]);

  const value = useMemo(() => layout, [layout]);

  return (
    <ShellLayoutContext.Provider value={value}>
      {children}
    </ShellLayoutContext.Provider>
  );
}

export function useShellLayout(): ShellLayoutValue {
  return useContext(ShellLayoutContext);
}

export function useShellLayoutMode(): ShellLayoutMode {
  return useShellLayout().mode;
}
