import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PluginPageHost } from '@kernel/plugin-system/ui/PluginPageHost';
import { useWorkspaceRuntimeRoute } from './hooks/useWorkspaceRuntimeRoute';

export function PluginRoutePage() {
  const { voltId, pageId: rawPageId } = useParams<{ voltId: string; pageId: string }>();
  const navigate = useNavigate();
  const workspace = useWorkspaceRuntimeRoute(voltId, navigate);
  const pageId = rawPageId ? decodeURIComponent(rawPageId) : '';

  useEffect(() => {
    const handlePluginUnload = (event: Event) => {
      const detail = (event as CustomEvent<{ pluginId: string }>).detail;
      if (!detail?.pluginId || !pageId.startsWith(`${detail.pluginId}:`) || !voltId) {
        return;
      }

      navigate(`/workspace/${voltId}`);
    };

    window.addEventListener('volt:plugin-unloaded', handlePluginUnload);
    return () => {
      window.removeEventListener('volt:plugin-unloaded', handlePluginUnload);
    };
  }, [navigate, pageId, voltId]);

  if (!workspace || !voltId || !pageId) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 0 calc(var(--safe-area-bottom) + var(--space-2))',
      }}
    >
      <PluginPageHost
        pageId={pageId}
        className=""
      />
    </div>
  );
}
