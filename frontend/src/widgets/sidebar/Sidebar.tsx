import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@app/providers/ThemeProvider';
import { useTabStore } from '@app/stores/tabStore';
import { FileTree } from '@widgets/file-tree/FileTree';
import styles from './Sidebar.module.scss';

const STORAGE_KEY = 'volt-sidebar-width';
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

function getInitialWidth(): number {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const n = Number(saved);
    if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
  }
  return 240;
}

interface SidebarProps {
  voltId: string;
  voltPath: string;
}

export function Sidebar({ voltId, voltPath }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const openGraphTab = useTabStore((s) => s.openGraphTab);
  const [width, setWidth] = useState(getInitialWidth);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(next);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  return (
    <aside className={styles.sidebar} style={{ width, minWidth: width }}>
      <div className={styles.treeContainer}>
        <FileTree voltId={voltId} voltPath={voltPath} />
      </div>
      <div className={styles.bottom}>
        <button className={styles.themeToggle} onClick={() => openGraphTab(voltId)}>
          Graph
        </button>
        <button className={styles.themeToggle} onClick={toggleTheme}>
          {theme === 'light' ? '\u{263E} Dark mode' : '\u{2600} Light mode'}
        </button>
      </div>
      <div className={styles.resizeHandle} onMouseDown={onMouseDown} />
    </aside>
  );
}
