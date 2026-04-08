import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabStore, type FileTab } from '@kernel/workspace/tabs/model';
import { useWorkspaceStore } from '@kernel/workspace/core/WorkspaceStore';
import { useNavigationStore } from '@kernel/navigation/model';
import { type PaneId, useWorkspaceViewStore } from '@kernel/workspace/panes/model';
import { usePluginRegistryStore } from '@kernel/plugin-system/model/pluginRegistry';
import { useWorkspaceSlotRegistry } from '@kernel/services/workspaceSlotRegistry';
import { useI18n } from '@app/providers/I18nProvider';
import { useShellLayout } from '@shared/responsive';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import { PluginPageHost } from '@kernel/plugin-system/ui/plugin-page';
import { SIDEBAR } from '@shared/config/constants';
import { FileTabs } from '../tabs/file-tabs/FileTabs';
import { WorkspaceToolbar } from './workspace-toolbar/WorkspaceToolbar';
import { useWorkspaceHotkeys } from './useWorkspaceHotkeys';
import styles from './WorkspaceShell.module.scss';

interface WorkspaceShellProps {
  voltId: string;
  locator: string;
}

const EMPTY_TABS: FileTab[] = [];

export function WorkspaceShell({ voltId, locator }: WorkspaceShellProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { mode } = useShellLayout();
  const isMobileShell = mode === 'mobile';
  const activeTabId = useTabStore((state) => state.activeTabs[voltId] ?? null);
  const voltTabs = useTabStore((state) => state.tabs[voltId] ?? EMPTY_TABS);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const workspaceView = useWorkspaceViewStore((state) => state.views[voltId]);
  const setActivePane = useWorkspaceViewStore((state) => state.setActivePane);
  const setSplitRatio = useWorkspaceViewStore((state) => state.setSplitRatio);
  const closeSecondary = useWorkspaceViewStore((state) => state.closeSecondary);
  const syncTabs = useWorkspaceViewStore((state) => state.syncTabs);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchOpenToken, setSearchOpenToken] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR.COLLAPSED_STORAGE_KEY) === 'true',
  );
  const hasToolbarButtons = usePluginRegistryStore((state) => state.toolbarButtons.length > 0);
  const slots = useWorkspaceSlotRegistry((state) => state.slots);
  const SidebarSlot = slots['sidebar'];
  const BreadcrumbsSlot = slots['breadcrumbs'];
  const FileViewHostSlot = slots['file-view-host'];
  const SearchPopupSlot = slots['search-popup'];
  const contentRef = useRef<HTMLDivElement>(null);
  const splitDraggingRef = useRef(false);
  const edgeSwipeRef = useRef<{ startX: number; active: boolean }>({ startX: 0, active: false });
  const drawerSwipeRef = useRef<{ startX: number; deltaX: number; active: boolean }>({
    startX: 0,
    deltaX: 0,
    active: false,
  });
  const [drawerSwipeOffset, setDrawerSwipeOffset] = useState(0);

  const openSearch = useCallback((initialQuery = '') => {
    setMobileDrawerOpen(false);
    setMobileFilesOpen(false);
    setSearchInitialQuery(initialQuery);
    setSearchOpenToken((current) => current + 1);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const openFindInFile = useCallback(() => {
    window.dispatchEvent(new CustomEvent('volt:find-in-file'));
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobileShell) {
      closeSearch();
      setMobileFilesOpen(false);
      setMobileDrawerOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
  }, [closeSearch, isMobileShell]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR.COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!isMobileShell) {
      setMobileDrawerOpen(false);
      setMobileFilesOpen(false);
    }
  }, [isMobileShell]);

  useWorkspaceHotkeys({
    voltId,
    onOpenSearch: openSearch,
    onToggleSidebar: toggleSidebar,
    onOpenFindInFile: openFindInFile,
  });

  const activeTab = voltTabs.find((tab) => tab.id === activeTabId) ?? null;
  const primaryTab = voltTabs.find((tab) => tab.id === workspaceView?.primaryTabId) ?? activeTab ?? null;
  const secondaryTab = voltTabs.find((tab) => tab.id === workspaceView?.secondaryTabId) ?? null;
  const activeFilePath = activeTab?.type === 'file' ? activeTab.filePath : null;
  const hasChromeStack = voltTabs.length > 0 || hasToolbarButtons || Boolean(primaryTab?.filePath);
  const splitRatio = workspaceView?.splitRatio ?? 0.5;
  const hasSecondaryPane = Boolean(secondaryTab);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  const pushNavigation = useNavigationStore((state) => state.push);

  useEffect(() => {
    syncTabs(voltId, voltTabs, activeTabId);
  }, [activeTabId, syncTabs, voltId, voltTabs]);

  useEffect(() => {
    if (activeFilePath) {
      pushNavigation(voltId, activeFilePath);
    }
  }, [activeFilePath, voltId, pushNavigation]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!splitDraggingRef.current) {
        return;
      }

      const content = contentRef.current;
      if (!content) {
        return;
      }

      const rect = content.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const nextRatio = (event.clientX - rect.left) / rect.width;
      setSplitRatio(voltId, nextRatio);
    };

    const handleMouseUp = () => {
      if (!splitDraggingRef.current) {
        return;
      }

      splitDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSplitRatio, voltId]);

  const focusPane = useCallback((paneId: PaneId, tab: FileTab | null) => {
    setActivePane(voltId, paneId);
    if (tab) {
      setActiveTab(voltId, tab.id);
    }
  }, [setActivePane, setActiveTab, voltId]);

  const startSplitResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    splitDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleWorkspaceSelect = useCallback((workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setMobileDrawerOpen(false);
    navigate(`/workspace/${workspaceId}`);
  }, [navigate, setActiveWorkspace]);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const renderTabSurface = useCallback((tab: FileTab | null) => {
    if (!tab) {
      return (
        <div className={styles.emptyPane}>
          <span className={styles.emptyPaneText}>{t('editor.empty')}</span>
        </div>
      );
    }

    if (tab.type === 'plugin') {
      return (
        <PluginPageHost
          pageId={tab.pluginPageId ?? ''}
          className={styles.pluginPage}
        />
      );
    }

    return FileViewHostSlot ? (
      <FileViewHostSlot
        voltId={voltId}
        locator={locator}
        filePath={tab.filePath}
      />
    ) : null;
  }, [FileViewHostSlot, locator, t, voltId]);

  return (
    <div className={styles.layout}>
      {!isMobileShell && SidebarSlot ? (
        <SidebarSlot
          voltId={voltId}
          locator={locator}
          onSearchClick={() => openSearch('')}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      ) : null}
      {isMobileShell && !mobileDrawerOpen ? (
        <div
          className={styles.mobileEdgeSwipeZone}
          aria-hidden="true"
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' || event.clientX > 28) {
              return;
            }

            edgeSwipeRef.current = {
              startX: event.clientX,
              active: true,
            };
          }}
          onPointerUp={(event) => {
            if (!edgeSwipeRef.current.active || event.pointerType === 'mouse') {
              return;
            }

            const delta = event.clientX - edgeSwipeRef.current.startX;
            edgeSwipeRef.current = { startX: 0, active: false };
            if (delta > 56) {
              setMobileDrawerOpen(true);
            }
          }}
          onPointerCancel={() => {
            edgeSwipeRef.current = { startX: 0, active: false };
          }}
        />
      ) : null}
      <div className={`${styles.main} ${isMobileShell ? styles.mainMobile : ''}`}>
        {isMobileShell ? (
          <div className={styles.mobileTopBar}>
            <button
              type="button"
              className={styles.mobileChromeButton}
              onClick={() => {
                setMobileFilesOpen(false);
                closeSearch();
                setMobileDrawerOpen(true);
              }}
              aria-label={t('workspace.mobile.menu')}
            >
              <Icon name="panelLeft" size={18} />
            </button>
            <div className={styles.mobileTitleGroup}>
              <div className={styles.mobileBreadcrumbs}>
                {BreadcrumbsSlot ? (
                  <BreadcrumbsSlot voltId={voltId} />
                ) : (
                  <span className={styles.mobileFallbackTitle}>
                    {activeTab?.fileName ?? t('editor.empty')}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.mobileTopBarActions}>
              <button
                type="button"
                className={`${styles.mobileChromeButton} ${mobileFilesOpen ? styles.mobileChromeButtonActive : ''}`}
                onClick={() => {
                  closeSearch();
                  setMobileDrawerOpen(false);
                  setMobileFilesOpen((prev) => !prev);
                }}
                aria-label={t('workspace.mobile.files')}
                aria-pressed={mobileFilesOpen}
                title={t('workspace.mobile.files')}
              >
                <Icon name="fileText" size={18} />
              </button>
              <button
                type="button"
                className={`${styles.mobileChromeButton} ${searchOpen ? styles.mobileChromeButtonActive : ''}`}
                onClick={() => {
                  if (searchOpen) {
                    closeSearch();
                    return;
                  }

                  openSearch('');
                }}
                aria-label={t('workspace.mobile.search')}
                aria-pressed={searchOpen}
                title={t('workspace.mobile.search')}
              >
                <Icon name="search" size={18} />
              </button>
              {hasToolbarButtons ? <WorkspaceToolbar mobile mobileMode="overflow-only" /> : null}
            </div>
          </div>
        ) : hasChromeStack ? (
          <div className={styles.chromeStack}>
            <FileTabs voltId={voltId} />
            <WorkspaceToolbar />
          </div>
        ) : null}
        <div ref={contentRef} className={`${styles.content} ${isMobileShell ? styles.contentMobile : ''}`}>
          {!isMobileShell ? (
            <div className={styles.breadcrumbsOverlay}>
              {BreadcrumbsSlot ? <BreadcrumbsSlot voltId={voltId} /> : null}
            </div>
          ) : null}
          <div className={styles.paneLayout}>
            <div
              className={[
                styles.workspacePane,
                workspaceView?.activePane === 'primary' ? styles.workspacePaneActive : '',
              ].filter(Boolean).join(' ')}
              style={!isMobileShell && hasSecondaryPane ? { flexBasis: `${splitRatio * 100}%` } : undefined}
              onMouseDownCapture={() => focusPane('primary', primaryTab)}
              data-pane-id="primary"
              data-tab-id={primaryTab?.id ?? ''}
              data-testid="workspace-pane-primary"
            >
              {renderTabSurface(primaryTab)}
            </div>
            {!isMobileShell && hasSecondaryPane ? (
              <>
                <div
                  className={styles.splitSeam}
                  onMouseDown={startSplitResize}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize workspace panes"
                  data-testid="workspace-split-seam"
                >
                  <button
                    type="button"
                    className={styles.secondaryClose}
                    data-testid="workspace-secondary-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeSecondary(voltId);
                      if (primaryTab) {
                        setActiveTab(voltId, primaryTab.id);
                      }
                    }}
                    aria-label="Close secondary pane"
                    title="Close secondary pane"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
                <div
                  className={[
                    styles.workspacePane,
                    workspaceView?.activePane === 'secondary' ? styles.workspacePaneActive : '',
                  ].filter(Boolean).join(' ')}
                  style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
                  onMouseDownCapture={() => focusPane('secondary', secondaryTab)}
                  data-pane-id="secondary"
                  data-tab-id={secondaryTab?.id ?? ''}
                  data-testid="workspace-pane-secondary"
                >
                  {renderTabSurface(secondaryTab)}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {isMobileShell && mobileDrawerOpen ? (
        <div
          className={styles.mobileDrawerOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMobileDrawerOpen(false);
            }
          }}
        >
          <div
            className={styles.mobileDrawerPanel}
            style={drawerSwipeOffset < 0 ? { transform: `translateX(${drawerSwipeOffset}px)` } : undefined}
          >
            <div
              className={styles.mobileDrawerHeader}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse') {
                  return;
                }

                drawerSwipeRef.current = {
                  startX: event.clientX,
                  deltaX: 0,
                  active: true,
                };
              }}
              onPointerMove={(event) => {
                if (!drawerSwipeRef.current.active || event.pointerType === 'mouse') {
                  return;
                }

                const nextDelta = Math.min(0, event.clientX - drawerSwipeRef.current.startX);
                drawerSwipeRef.current.deltaX = nextDelta;
                setDrawerSwipeOffset(nextDelta);
              }}
              onPointerUp={() => {
                const shouldClose = drawerSwipeRef.current.deltaX < -72;
                drawerSwipeRef.current = { startX: 0, deltaX: 0, active: false };
                setDrawerSwipeOffset(0);
                if (shouldClose) {
                  setMobileDrawerOpen(false);
                }
              }}
              onPointerCancel={() => {
                drawerSwipeRef.current = { startX: 0, deltaX: 0, active: false };
                setDrawerSwipeOffset(0);
              }}
            >
              <div className={styles.mobileDrawerHandle} aria-hidden="true" />
              <div className={styles.mobileDrawerHeading}>
                <span className={styles.mobileDrawerEyebrow}>{activeWorkspace?.displayName ?? 'Volt'}</span>
                <span className={styles.mobileDrawerTitle}>{t('workspace.mobile.menu')}</span>
              </div>
              <button
                type="button"
                className={styles.mobileDrawerClose}
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t('common.close')}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className={styles.mobileDrawerNav}>
              <button
                type="button"
                className={styles.mobileDrawerNavButton}
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/');
                }}
              >
                <Icon name="home" size={18} />
                <span>{t('workspace.mobile.home')}</span>
              </button>
              <button
                type="button"
                className={styles.mobileDrawerNavButton}
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/settings');
                }}
              >
                <Icon name="settings" size={18} />
                <span>{t('workspace.mobile.settings')}</span>
              </button>
            </div>
            <div className={styles.mobileDrawerSection}>
              <span className={styles.mobileDrawerSectionTitle}>
                {t('workspace.mobile.workspaces')}
              </span>
              <div className={styles.mobileWorkspaceList}>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className={`${styles.mobileWorkspaceItem} ${workspace.id === activeWorkspaceId ? styles.mobileWorkspaceItemActive : ''}`}
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                  >
                    <span className={styles.mobileWorkspaceItemTitle}>{workspace.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.mobileDrawerSidebar}>
              {SidebarSlot ? (
                <SidebarSlot
                  voltId={voltId}
                  locator={locator}
                  onSearchClick={() => openSearch('')}
                  collapsed={false}
                  onToggleCollapse={() => undefined}
                  variant="drawer"
                  onFileOpen={closeMobileDrawer}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {SearchPopupSlot ? (
        <SearchPopupSlot
          isOpen={searchOpen}
          initialQuery={searchInitialQuery}
          openToken={searchOpenToken}
          onClose={closeSearch}
          voltId={voltId}
          locator={locator}
          onToggleSidebar={toggleSidebar}
        />
      ) : null}
      {isMobileShell ? (
        <Modal
          isOpen={mobileFilesOpen}
          onClose={() => setMobileFilesOpen(false)}
          title={t('workspace.mobile.openFiles')}
        >
          <div className={styles.mobileFilesList}>
            {voltTabs.length === 0 ? (
              <div className={styles.mobileFilesEmpty}>
                {t('workspace.mobile.noOpenFiles')}
              </div>
            ) : (
              voltTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`${styles.mobileFileRow} ${tab.id === activeTabId ? styles.mobileFileRowActive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.mobileFileButton}
                    onClick={() => {
                      setActiveTab(voltId, tab.id);
                      setMobileFilesOpen(false);
                    }}
                  >
                    <span className={styles.mobileFileText}>
                      {tab.isDirty ? <span className={styles.mobileFileDirty} aria-hidden="true" /> : null}
                      {tab.fileName}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.mobileFileClose}
                    onClick={() => {
                      closeTab(voltId, tab.id);
                    }}
                    aria-label={t('fileTabs.closeTab', { name: tab.fileName })}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
