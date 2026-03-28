import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@app/providers/I18nProvider';
import { useTheme } from '@app/providers/ThemeProvider';
import { listPlugins, setPluginEnabled } from '@api/plugin';
import type { PluginInfo } from '@api/plugin';
import { loadSinglePlugin, unloadSinglePlugin } from '@app/plugins/pluginLoader';
import { usePluginLogStore } from '@app/plugins/pluginLogStore';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { PermissionDialog } from '@widgets/permission-dialog/PermissionDialog';
import { Icon } from '@uikit/icon';
import styles from './SettingsPage.module.scss';

const IMAGE_DIR_KEY = 'volt-image-dir';

type SettingsTab = 'general' | 'plugins' | 'about';

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export function SettingsPage({ initialTab = 'general' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, selectedLocale, availableLocales, setLocale, refreshLocalization } = useI18n();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const pluginLogEntries = usePluginLogStore((state) => state.entries);
  const clearPluginLog = usePluginLogStore((state) => state.clearAll);
  const [imageDir, setImageDir] = useState(() => localStorage.getItem(IMAGE_DIR_KEY) || 'attachments');
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [confirmPlugin, setConfirmPlugin] = useState<PluginInfo | null>(null);
  const activeWorkspace = workspaces.find((workspace) => workspace.voltId === activeWorkspaceId) ?? null;

  const fetchPlugins = useCallback(async () => {
    try {
      const list = await listPlugins();
      setPlugins(list);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    }
  }, []);

  const applyPluginToggle = useCallback(async (plugin: PluginInfo, nextEnabled: boolean) => {
    try {
      await setPluginEnabled(plugin.manifest.id, nextEnabled);
      setPlugins((prev) =>
        prev.map((p) =>
          p.manifest.id === plugin.manifest.id ? { ...p, enabled: nextEnabled } : p,
        ),
      );

      if (nextEnabled) {
        if (activeWorkspace?.voltPath) {
          await loadSinglePlugin(plugin.manifest.id, activeWorkspace.voltPath);
        }
      } else {
        unloadSinglePlugin(plugin.manifest.id);
      }
    } catch (err) {
      console.error('Failed to toggle plugin:', err);
    }
  }, [activeWorkspace?.voltPath]);

  const handleTogglePlugin = useCallback(async (plugin: PluginInfo) => {
    if (!plugin.enabled && plugin.manifest.permissions.length > 0) {
      setConfirmPlugin(plugin);
      return;
    }

    await applyPluginToggle(plugin, !plugin.enabled);
  }, [applyPluginToggle]);

  useEffect(() => {
    if (activeTab === 'plugins') {
      void fetchPlugins();
    }
  }, [activeTab, fetchPlugins]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void refreshLocalization().catch(() => undefined);
  }, [refreshLocalization]);

  const languageValue = (
    selectedLocale === 'auto' || availableLocales.some((locale) => locale.code === selectedLocale)
  ) ? selectedLocale : 'auto';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> {t('common.back')}
        </button>
        <h1>{t('settings.title')}</h1>
      </div>
      <div className={styles.layout}>
        <nav className={styles.tabs}>
          <button className={activeTab === 'general' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('general')}>{t('settings.tab.general')}</button>
          <button className={activeTab === 'plugins' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('plugins')}>{t('settings.tab.plugins')}</button>
          <button className={activeTab === 'about' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('about')}>{t('settings.tab.about')}</button>
        </nav>
        <div className={styles.content}>
          {activeTab === 'general' && (
            <div className={styles.section}>
              <h2>{t('settings.section.localization')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.language.label')}</label>
                <select
                  value={languageValue}
                  onChange={(e) => {
                    void setLocale(e.target.value);
                  }}
                >
                  <option value="auto">{t('common.auto')}</option>
                  {availableLocales.map((locale) => (
                    <option key={locale.code} value={locale.code}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {t('settings.language.autoHint')}
              </p>

              <h2 style={{ marginTop: 'var(--space-4)' }}>{t('settings.section.appearance')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.theme')}</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
                  <option value="light">{t('common.light')}</option>
                  <option value="dark">{t('common.dark')}</option>
                </select>
              </div>
              <h2 style={{ marginTop: 'var(--space-4)' }}>{t('settings.section.files')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.imageDirectory')}</label>
                <input
                  type="text"
                  value={imageDir}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageDir(val);
                    localStorage.setItem(IMAGE_DIR_KEY, val);
                  }}
                  placeholder="attachments"
                  className={styles.textInput}
                />
              </div>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {t('settings.imageDirectoryHint')}
              </p>
            </div>
          )}
          {activeTab === 'plugins' && (
            <div className={styles.section}>
              <h2>{t('settings.plugins.title')}</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>{t('settings.plugins.description')}</p>
              {plugins.length === 0 ? (
                <p style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.plugins.empty')}</p>
              ) : (
                <div className={styles.pluginList}>
                  {plugins.map((p) => (
                    <div key={p.manifest.id} className={styles.pluginItem}>
                      <div className={styles.pluginInfo}>
                        <div className={styles.pluginName}>
                          {p.manifest.name}
                          <span className={styles.pluginVersion}>v{p.manifest.version}</span>
                        </div>
                        {p.manifest.description && (
                          <div className={styles.pluginDescription}>{p.manifest.description}</div>
                        )}
                      </div>
                      <button
                        className={`${styles.toggle} ${p.enabled ? styles.toggleOn : ''}`}
                        onClick={() => void handleTogglePlugin(p)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {pluginLogEntries.length > 0 && (
                <div className={styles.logSection}>
                  <div className={styles.logHeader}>
                    <h3>{t('settings.plugins.logTitle')}</h3>
                    <button type="button" className={styles.clearLogsButton} onClick={clearPluginLog}>
                      {t('settings.plugins.logClear')}
                    </button>
                  </div>
                  <div className={styles.logList}>
                    {[...pluginLogEntries].reverse().map((entry) => (
                      <div key={entry.id} className={styles.logItem}>
                        <div className={styles.logMeta}>
                          <span className={styles.logPlugin}>{entry.pluginId}</span>
                          <span className={styles.logLevel}>{entry.level}</span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <div className={styles.logMessage}>{entry.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'about' && (
            <div className={styles.section}>
              <h2>{t('settings.about.title')}</h2>
              <p>{t('settings.about.version')}</p>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{t('settings.about.description')}</p>
            </div>
          )}
        </div>
      </div>
      <PermissionDialog
        isOpen={confirmPlugin != null}
        plugin={confirmPlugin}
        onCancel={() => setConfirmPlugin(null)}
        onConfirm={() => {
          const plugin = confirmPlugin;
          setConfirmPlugin(null);
          if (plugin) {
            void applyPluginToggle(plugin, true);
          }
        }}
      />
    </div>
  );
}
