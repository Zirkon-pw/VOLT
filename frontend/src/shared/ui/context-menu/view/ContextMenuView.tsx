import { useEffect, useRef } from 'react';
import { Icon } from '@shared/ui/icon';
import type { ContextMenuItem } from '../model/types';
import styles from './ContextMenuView.module.scss';

interface ContextMenuViewProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  presentation: 'popover' | 'sheet';
}

export function ContextMenuView({ items, position, onClose, presentation }: ContextMenuViewProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (presentation !== 'popover') {
      return;
    }

    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxLeft = Math.max(4, viewportWidth - rect.width - 4);
    const maxTop = Math.max(4, viewportHeight - rect.height - 4);
    const clampedLeft = Math.min(Math.max(position.x, 4), maxLeft);
    const clampedTop = Math.min(Math.max(position.y, 4), maxTop);

    menu.style.left = `${clampedLeft}px`;
    menu.style.top = `${clampedTop}px`;
  }, [position, presentation]);

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
        className={presentation === 'sheet' ? styles.sheet : styles.menu}
        data-testid="context-menu"
        role="menu"
        style={presentation === 'popover' ? { left: position.x, top: position.y } : undefined}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className={styles.separator} />;
          }
          return (
            <button
              key={index}
              type="button"
              className={[
                styles.item,
                item.danger ? styles.danger : '',
                item.active ? styles.active : '',
              ].filter(Boolean).join(' ')}
              data-testid="context-menu-item"
              disabled={item.disabled}
              role="menuitem"
              aria-label={item.ariaLabel ?? item.label}
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
              {item.shortcut && (
                <span className={styles.shortcut}>{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
