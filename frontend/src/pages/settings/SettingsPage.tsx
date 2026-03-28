import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { listPlugins, setPluginEnabled } from '@api/plugin';
import type { PluginInfo, PluginSettingField, PluginSettingsSection } from '@api/plugin';
import { useI18n } from '@app/providers/I18nProvider';
import { useTheme } from '@app/providers/ThemeProvider';
import { usePluginLogStore } from '@app/plugins/pluginLogStore';
import {
  ensurePluginSettingsLoaded,
  getMergedPluginSettings,
  setPluginSettingValue,
  usePluginSettingsStore,
} from '@app/plugins/pluginSettingsStore';
import { loadSinglePlugin, unloadSinglePlugin } from '@app/plugins/pluginLoader';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { PermissionDialog } from '@widgets/permission-dialog/PermissionDialog';
import { Icon } from '@uikit/icon';
import styles from './SettingsPage.module.scss';

const IMAGE_DIR_KEY = 'volt-image-dir';
const EMPTY_PLUGIN_SETTINGS: Record<string, unknown> = {};

export type SettingsSection = 'general' | 'plugins' | 'about' | 'plugin';

interface SettingsPageProps {
  section?: SettingsSection;
  pluginId?: string;
}

interface PluginSettingsViewProps {
  plugin: PluginInfo;
}

function formatNumberInputValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function renderFieldValue(
  pluginId: string,
  field: PluginSettingField,
  value: unknown,
  sections: PluginSettingsSection[],
) {
  if (field.type === 'toggle') {
    return (
      <button
        type="button"
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => {
          void setPluginSettingValue(pluginId, field.key, !(value === true), sections);
        }}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${styles.textInput} ${styles.textareaInput}`}
        value={typeof value === 'string' ? value : field.defaultValue}
        placeholder={field.placeholder}
        onChange={(event) => {
          void setPluginSettingValue(pluginId, field.key, event.target.value, sections);
        }}
      />
    );
  }

  if (field.type === 'text') {
    return (
      <input
        type="text"
        className={styles.textInput}
        value={typeof value === 'string' ? value : field.defaultValue}
        placeholder={field.placeholder}
        onChange={(event) => {
          void setPluginSettingValue(pluginId, field.key, event.target.value, sections);
        }}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={styles.textInput}
        min={field.min}
        max={field.max}
        step={field.step}
        value={formatNumberInputValue(value)}
        onChange={(event) => {
          const nextValue = event.target.value;
          void setPluginSettingValue(
            pluginId,
            field.key,
            nextValue === '' ? field.defaultValue : Number(nextValue),
            sections,
          );
        }}
      />
    );
  }

  return (
    <select
      value={typeof value === 'string' ? value : field.defaultValue}
      onChange={(event) => {
        void setPluginSettingValue(pluginId, field.key, event.target.value, sections);
      }}
    >
      {field.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PluginSettingsView({ plugin }: PluginSettingsViewProps) {
  const { t } = useI18n();
  const sections = plugin.manifest.settings?.sections ?? [];
  const pluginId = plugin.manifest.id;
  const rawPluginValues = usePluginSettingsStore((state) => state.valuesByPlugin[pluginId]);
  const rawValues = rawPluginValues ?? EMPTY_PLUGIN_SETTINGS;
  const logEntries = usePluginLogStore((state) => state.entries);
  const clearPluginLog = usePluginLogStore((state) => state.clearByPlugin);
  const pluginLogEntries = useMemo(
    () => logEntries.filter((entry) => entry.pluginId === pluginId),
    [logEntries, pluginId],
  );

  useEffect(() => {
    void ensurePluginSettingsLoaded(pluginId).catch(() => undefined);
  }, [pluginId]);

  const mergedValues = getMergedPluginSettings(pluginId, sections, rawValues);

  return (
    <div className={styles.section}>
      <div className={styles.pluginSettingsHeader}>
        <div>
          <h2>{plugin.manifest.name}</h2>
          {plugin.manifest.description && (
            <p className={styles.sectionDescription}>{plugin.manifest.description}</p>
          )}
        </div>
        <div className={`${styles.statusBadge} ${plugin.enabled ? styles.statusEnabled : styles.statusDisabled}`}>
          {plugin.enabled ? t('common.enabled') : t('common.disabled')}
        </div>
      </div>

      {!plugin.enabled && (
        <div className={styles.pluginSettingsNotice}>
          {t('settings.plugins.disabledNotice')}
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className={styles.pluginSettingsSectionCard}>
          {section.title && <h3 className={styles.pluginSettingsTitle}>{section.title}</h3>}
          {section.description && (
            <p className={styles.pluginSettingsDescription}>{section.description}</p>
          )}
          <div className={styles.pluginSettingsFields}>
            {section.fields.map((field) => (
              <div key={field.key} className={styles.pluginFieldRow}>
                <div className={styles.pluginFieldBody}>
                  <div className={styles.pluginFieldLabel}>{field.label}</div>
                  {field.description && (
                    <div className={styles.pluginFieldDescription}>{field.description}</div>
                  )}
                </div>
                <div className={styles.pluginFieldControl}>
                  {renderFieldValue(pluginId, field, mergedValues[field.key], sections)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {pluginLogEntries.length > 0 && (
        <div className={styles.logSection}>
          <div className={styles.logHeader}>
            <h3>{t('settings.plugins.logTitle')}</h3>
            <button
              type="button"
              className={styles.clearLogsButton}
              onClick={() => clearPluginLog(pluginId)}
            >
              {t('settings.plugins.logClear')}
            </button>
          </div>
          <div className={styles.logList}>
            {[...pluginLogEntries].reverse().map((entry) => (
              <div key={entry.id} className={styles.logItem}>
                <div className={styles.logMeta}>
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
  );
}

export function SettingsPage({
  section = 'general',
  pluginId,
}: SettingsPageProps) {
  const navigate = useNavigate();
  const { t, selectedLocale, availableLocales, setLocale, refreshLocalization } = useI18n();
  const { theme, setTheme } = useTheme();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  const [confirmPlugin, setConfirmPlugin] = useState<PluginInfo | null>(null);
  const [imageDir, setImageDir] = useState(() => localStorage.getItem(IMAGE_DIR_KEY) || 'attachments');
  const activeWorkspace = workspaces.find((workspace) => workspace.voltId === activeWorkspaceId) ?? null;

  const fetchPlugins = useCallback(async () => {
    try {
      const list = await listPlugins();
      setPlugins(list);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setPluginsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void fetchPlugins();
  }, [fetchPlugins]);

  useEffect(() => {
    void refreshLocalization().catch(() => undefined);
  }, [refreshLocalization]);

  const applyPluginToggle = useCallback(async (plugin: PluginInfo, nextEnabled: boolean) => {
    try {
      await setPluginEnabled(plugin.manifest.id, nextEnabled);
      setPlugins((prev) =>
        prev.map((current) =>
          current.manifest.id === plugin.manifest.id ? { ...current, enabled: nextEnabled } : current,
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

  const settingsPlugins = useMemo(
    () => [...plugins]
      .filter((plugin) => plugin.enabled)
      .filter((plugin) => (plugin.manifest.settings?.sections ?? []).length > 0)
      .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name)),
    [plugins],
  );

  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.manifest.id === pluginId) ?? null,
    [pluginId, plugins],
  );

  const hasSelectedPluginSettings = (selectedPlugin?.manifest.settings?.sections ?? []).length > 0;

  const navItems = useMemo(() => {
    const items = [
      { key: 'general', label: t('settings.tab.general'), path: '/settings' },
      { key: 'plugins', label: t('settings.tab.plugins'), path: '/settings/plugins' },
      ...settingsPlugins.map((plugin) => ({
        key: `plugin:${plugin.manifest.id}`,
        label: plugin.manifest.name,
        path: `/settings/plugin/${plugin.manifest.id}`,
      })),
      { key: 'about', label: t('settings.tab.about'), path: '/settings/about' },
    ];
    return items;
  }, [settingsPlugins, t]);

  const activeNavKey = section === 'plugin' && pluginId ? `plugin:${pluginId}` : section;

  const languageValue = (
    selectedLocale === 'auto' || availableLocales.some((locale) => locale.code === selectedLocale)
  ) ? selectedLocale : 'auto';

  if (section === 'plugin' && pluginsLoaded && (!selectedPlugin || !hasSelectedPluginSettings)) {
    return <Navigate to="/settings/plugins" replace />;
  }

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
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activeNavKey === item.key ? styles.activeTab : styles.tab}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.content}>
          {section === 'general' && (
            <div className={styles.section}>
              <h2>{t('settings.section.localization')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.language.label')}</label>
                <select
                  value={languageValue}
                  onChange={(event) => {
                    void setLocale(event.target.value);
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
              <p className={styles.helperText}>{t('settings.language.autoHint')}</p>

              <h2 className={styles.sectionTitle}>{t('settings.section.appearance')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.theme')}</label>
                <select value={theme} onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}>
                  <option value="light">{t('common.light')}</option>
                  <option value="dark">{t('common.dark')}</option>
                </select>
              </div>

              <h2 className={styles.sectionTitle}>{t('settings.section.files')}</h2>
              <div className={styles.settingRow}>
                <label>{t('settings.imageDirectory')}</label>
                <input
                  type="text"
                  value={imageDir}
                  onChange={(event) => {
                    const value = event.target.value;
                    setImageDir(value);
                    localStorage.setItem(IMAGE_DIR_KEY, value);
                  }}
                  placeholder="attachments"
                  className={styles.textInput}
                />
              </div>
              <p className={styles.helperText}>{t('settings.imageDirectoryHint')}</p>
            </div>
          )}

          {section === 'plugins' && (
            <div className={styles.section}>
              <h2>{t('settings.plugins.title')}</h2>
              <p className={styles.sectionDescription}>{t('settings.plugins.description')}</p>
              {plugins.length === 0 ? (
                <p className={styles.emptyMessage}>{t('settings.plugins.empty')}</p>
              ) : (
                <div className={styles.pluginList}>
                  {plugins.map((plugin) => (
                    <div key={plugin.manifest.id} className={styles.pluginCard}>
                      <div className={styles.pluginItem}>
                        <div className={styles.pluginInfo}>
                          <div className={styles.pluginName}>
                            {plugin.manifest.name}
                            <span className={styles.pluginVersion}>v{plugin.manifest.version}</span>
                          </div>
                          {plugin.manifest.description && (
                            <div className={styles.pluginDescription}>{plugin.manifest.description}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`${styles.toggle} ${plugin.enabled ? styles.toggleOn : ''}`}
                          onClick={() => {
                            void handleTogglePlugin(plugin);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'plugin' && selectedPlugin && hasSelectedPluginSettings && (
            <PluginSettingsView plugin={selectedPlugin} />
          )}

          {section === 'about' && (
            <div className={styles.section}>
              <h2>{t('settings.about.title')}</h2>
              <p>{t('settings.about.version')}</p>
              <p className={styles.sectionDescription}>{t('settings.about.description')}</p>
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
