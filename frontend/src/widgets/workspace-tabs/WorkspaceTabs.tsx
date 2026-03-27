import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import styles from './WorkspaceTabs.module.scss';

export function WorkspaceTabs() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, closeWorkspace } =
    useWorkspaceStore();
  const navigate = useNavigate();

  if (workspaces.length === 0) return null;

  const handleClick = (voltId: string) => {
    setActiveWorkspace(voltId);
    navigate(`/workspace/${voltId}`);
  };

  const handleClose = (e: React.MouseEvent, voltId: string) => {
    e.stopPropagation();
    closeWorkspace(voltId);
    const remaining = workspaces.filter((w) => w.voltId !== voltId);
    if (remaining.length === 0) {
      navigate('/');
    } else if (activeWorkspaceId === voltId) {
      const last = remaining[remaining.length - 1];
      navigate(`/workspace/${last.voltId}`);
    }
  };

  return (
    <div className={styles.bar}>
      {workspaces.map((ws) => (
        <div
          key={ws.voltId}
          className={`${styles.tab} ${ws.voltId === activeWorkspaceId ? styles.active : ''}`}
          onClick={() => handleClick(ws.voltId)}
        >
          <span className={styles.label}>{ws.voltName}</span>
          <button
            className={styles.closeBtn}
            onClick={(e) => handleClose(e, ws.voltId)}
            aria-label={`Close ${ws.voltName}`}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
