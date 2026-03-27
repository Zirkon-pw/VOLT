import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { HomePage } from '@pages/home/HomePage';
import { WorkspacePage } from '@pages/workspace/WorkspacePage';
import { WorkspaceTabs } from '@widgets/workspace-tabs/WorkspaceTabs';
import styles from './AppRouter.module.scss';

function AppLayout() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hasWorkspaces = workspaces.length > 0;

  return (
    <div className={styles.root}>
      {hasWorkspaces && <WorkspaceTabs />}
      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace/:voltId" element={<WorkspacePage />} />
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
