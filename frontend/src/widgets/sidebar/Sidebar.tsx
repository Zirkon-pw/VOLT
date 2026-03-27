import { useTheme } from '@app/providers/ThemeProvider';
import { useTabStore } from '@app/stores/tabStore';
import { FileTree } from '@widgets/file-tree/FileTree';
import styles from './Sidebar.module.scss';

interface SidebarProps {
  voltId: string;
  voltPath: string;
}

export function Sidebar({ voltId, voltPath }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const openGraphTab = useTabStore((s) => s.openGraphTab);

  return (
    <aside className={styles.sidebar}>
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
    </aside>
  );
}
