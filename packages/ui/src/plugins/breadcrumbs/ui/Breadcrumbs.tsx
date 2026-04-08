import { Fragment, useCallback } from 'react';
import { useTabStore } from '@kernel/workspace/tabs/model';
import { useNavigationStore } from '@kernel/navigation/model';
import { openFileInActivePane } from '@kernel/workspace/panes/model';
import { useShellLayoutMode } from '@shared/responsive';
import { Icon } from '@shared/ui/icon';
import styles from './Breadcrumbs.module.scss';

interface BreadcrumbsProps {
  voltId: string;
}

export function Breadcrumbs({ voltId }: BreadcrumbsProps) {
  const layoutMode = useShellLayoutMode();
  const isMobile = layoutMode === 'mobile';
  const activeTabs = useTabStore((state) => state.activeTabs);
  const allTabs = useTabStore((state) => state.tabs);
  const canGoBack = useNavigationStore((state) => state.canGoBack(voltId));
  const canGoForward = useNavigationStore((state) => state.canGoForward(voltId));
  const goBack = useNavigationStore((state) => state.goBack);
  const goForward = useNavigationStore((state) => state.goForward);

  const activeTabId = activeTabs[voltId] ?? null;
  const voltTabs = allTabs[voltId] ?? [];
  const activeTab = voltTabs.find((tab) => tab.id === activeTabId) ?? null;
  const filePath = activeTab?.type === 'file' ? activeTab.filePath : null;

  const segments = filePath ? filePath.split('/').filter(Boolean) : [];
  const displaySegments = isMobile ? segments.slice(-1) : segments;

  const navigateBack = useCallback(() => {
    const target = goBack(voltId);
    if (!target) return;
    const fileName = target.split('/').pop() ?? target;
    openFileInActivePane(voltId, target, fileName);
  }, [goBack, voltId]);

  const navigateForward = useCallback(() => {
    const target = goForward(voltId);
    if (!target) return;
    const fileName = target.split('/').pop() ?? target;
    openFileInActivePane(voltId, target, fileName);
  }, [goForward, voltId]);

  if (!filePath) return null;

  if (isMobile) {
    const currentLabel = displaySegments[displaySegments.length - 1] ?? activeTab?.fileName ?? '';

    return (
      <div className={`${styles.bar} ${styles.barMobile}`} data-testid="breadcrumbs">
        <div className={`${styles.crumbs} ${styles.crumbsMobile}`} data-testid="breadcrumbs-capsule">
          <span
            className={styles.mobileCurrent}
            data-testid="breadcrumb-active"
            title={currentLabel}
          >
            {currentLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bar} data-testid="breadcrumbs">
      <div className={styles.navButtons}>
        <button
          className={styles.navBtn}
          disabled={!canGoBack}
          onClick={navigateBack}
          aria-label="Go back"
        >
          <Icon name="arrowLeft" size={14} />
        </button>
        <button
          className={styles.navBtn}
          disabled={!canGoForward}
          onClick={navigateForward}
          aria-label="Go forward"
        >
          <Icon name="arrowRight" size={14} />
        </button>
      </div>
      <div className={styles.crumbs} data-testid="breadcrumbs-capsule">
        {displaySegments.map((segment, i) => (
          <Fragment key={i}>
            {i > 0 && <Icon name="chevronRight" size={10} className={styles.separator} />}
            <span
              className={i === displaySegments.length - 1 ? styles.activeCrumb : styles.crumb}
              data-testid={i === displaySegments.length - 1 ? 'breadcrumb-active' : 'breadcrumb-segment'}
              title={segment}
            >
              {segment}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
