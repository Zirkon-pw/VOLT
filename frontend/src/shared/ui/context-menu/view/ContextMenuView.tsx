import { useEffect, useRef } from 'react';
import { Icon } from '@shared/ui/icon';
import type { ContextMenuItem } from '../model/types';
import styles from './ContextMenuView.module.scss';

interface ContextMenuViewProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenuView({ items, position, onClose }: ContextMenuViewProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 4}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 4}px`;
    }
  }, [position]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div
        className={styles.overlay}
        data-testid="context-menu-overlay"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className={styles.menu}
        data-testid="context-menu"
        role="menu"
        style={{ left: position.x, top: position.y }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className={styles.separator} />;
          }
          return (
            <button
              key={index}
              type="button"
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              data-testid="context-menu-item"
              disabled={item.disabled}
              role="menuitem"
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {item.icon && (
                <span className={styles.icon}>
                  <Icon name={item.icon} size={14} />
                </span>
              )}
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
