import { useTabStore } from '@app/stores/tabStore';
import styles from './FileTabs.module.scss';

interface FileTabsProps {
  voltId: string;
}

export function FileTabs({ voltId }: FileTabsProps) {
  const { tabs, activeTabs, setActiveTab, closeTab } = useTabStore();
  const voltTabs = tabs[voltId] ?? [];
  const activeTabId = activeTabs[voltId] ?? null;

  if (voltTabs.length === 0) return null;

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    // Middle click closes tab
    if (e.button === 1) {
      e.preventDefault();
      closeTab(voltId, tabId);
    }
  };

  return (
    <div className={styles.bar}>
      {voltTabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
          onClick={() => setActiveTab(voltId, tab.id)}
          onMouseDown={(e) => handleMouseDown(e, tab.id)}
        >
          <span className={styles.label}>
            {tab.isDirty && <span className={styles.dirty} />}
            {tab.fileName}
          </span>
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              closeTab(voltId, tab.id);
            }}
            aria-label={`Close ${tab.fileName}`}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
