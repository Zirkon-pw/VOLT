import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@app/providers/I18nProvider';
import { useWorkspaceStore } from '@kernel/workspace/core/WorkspaceStore';
import { Icon } from '@shared/ui/icon';
import styles from './WorkspaceTabs.module.scss';

export function WorkspaceTabs() {
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, closeWorkspace, reorderWorkspaces } =
    useWorkspaceStore();
  const navigate = useNavigate();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleClick = (id: string) => {
    setActiveWorkspace(id);
    navigate(`/workspace/${id}`);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeWorkspace(id);
    const remaining = workspaces.filter((w) => w.id !== id);
    if (remaining.length === 0) {
      navigate('/');
    } else if (activeWorkspaceId === id) {
      const last = remaining[remaining.length - 1];
      navigate(`/workspace/${last.id}`);
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.headerButtons}>
        <button className={styles.headerBtn} onClick={() => navigate('/')} title={t('workspaceTabs.home')}>
          <Icon name="home" size={16} />
        </button>
        <button className={styles.headerBtn} onClick={() => navigate('/settings')} title={t('workspaceTabs.settings')}>
          <Icon name="settings" size={16} />
        </button>
        <div className={styles.separator} />
      </div>
      {workspaces.map((ws, index) => (
        <div
          key={ws.id}
          className={`${styles.tab} ${ws.id === activeWorkspaceId ? styles.active : ''} ${dragIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
          onClick={() => handleClick(ws.id)}
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            setDragIndex(index);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverIndex(index);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== index) {
              reorderWorkspaces(dragIndex, index);
            }
            setDragIndex(null);
            setDragOverIndex(null);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setDragOverIndex(null);
          }}
        >
          <span className={styles.label}>{ws.displayName}</span>
          <button
            className={styles.closeBtn}
            onClick={(e) => handleClose(e, ws.id)}
            aria-label={t('workspaceTabs.closeWorkspace', { name: ws.displayName })}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
