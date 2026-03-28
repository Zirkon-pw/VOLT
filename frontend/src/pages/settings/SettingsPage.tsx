import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@app/providers/ThemeProvider';
import { Icon } from '@uikit/icon';
import styles from './SettingsPage.module.scss';

const IMAGE_DIR_KEY = 'volt-image-dir';

type SettingsTab = 'general' | 'plugins' | 'about';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [imageDir, setImageDir] = useState(() => localStorage.getItem(IMAGE_DIR_KEY) || 'attachments');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> Back
        </button>
        <h1>Settings</h1>
      </div>
      <div className={styles.layout}>
        <nav className={styles.tabs}>
          <button className={activeTab === 'general' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('general')}>General</button>
          <button className={activeTab === 'plugins' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('plugins')}>Plugins</button>
          <button className={activeTab === 'about' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('about')}>About</button>
        </nav>
        <div className={styles.content}>
          {activeTab === 'general' && (
            <div className={styles.section}>
              <h2>Appearance</h2>
              <div className={styles.settingRow}>
                <label>Theme</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <h2 style={{ marginTop: 'var(--space-4)' }}>Files</h2>
              <div className={styles.settingRow}>
                <label>Image directory</label>
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
                Relative path inside the vault where images will be saved when dropped or selected.
              </p>
            </div>
          )}
          {activeTab === 'plugins' && (
            <div className={styles.section}>
              <h2>Plugins</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Manage installed plugins. Plugin directory: ~/.volt/plugins/</p>
            </div>
          )}
          {activeTab === 'about' && (
            <div className={styles.section}>
              <h2>About Volt</h2>
              <p>Version 0.0.1</p>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>Knowledge management for power users.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
