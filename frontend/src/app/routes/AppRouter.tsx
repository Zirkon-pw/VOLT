import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@pages/home/HomePage';
import { WorkspacePage } from '@pages/workspace/WorkspacePage';
import { PluginSettingsPage } from '@pages/settings/PluginSettingsPage';
import { SettingsPage } from '@pages/settings/SettingsPage';
import { WorkspaceTabs } from '@widgets/workspace-tabs/WorkspaceTabs';
import styles from './AppRouter.module.scss';

function AppLayout() {
  return (
    <div className={styles.root}>
      <WorkspaceTabs />
      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace/:voltId" element={<WorkspacePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/plugins" element={<PluginSettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
