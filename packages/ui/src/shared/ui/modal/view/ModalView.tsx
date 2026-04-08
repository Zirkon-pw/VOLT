import { ReactNode, MouseEvent, useRef, useState } from 'react';
import { BUILTIN_SHORTCUT_ACTIONS, useShortcutAction } from '@plugins/settings/SettingsStore';
import { useShellLayout } from '@shared/responsive';
import { translate } from '@shared/i18n';
import { Icon } from '@shared/ui/icon';
import styles from './ModalView.module.scss';

interface ModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ModalView({ isOpen, onClose, title, children }: ModalViewProps) {
  const { mode } = useShellLayout();
  const isMobile = mode === 'mobile';
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useShortcutAction(BUILTIN_SHORTCUT_ACTIONS.modalClose, onClose, {
    enabled: isOpen,
    allowInEditable: true,
  });

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDragStart = (clientY: number) => {
    dragStartRef.current = clientY;
    draggingRef.current = true;
  };

  const handleDragMove = (clientY: number) => {
    if (!draggingRef.current || dragStartRef.current == null) {
      return;
    }

    setDragOffset(Math.max(0, clientY - dragStartRef.current));
  };

  const finishDrag = () => {
    if (!draggingRef.current) {
      return;
    }

    const shouldClose = dragOffset > 96;
    dragStartRef.current = null;
    draggingRef.current = false;
    setDragOffset(0);

    if (shouldClose) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={`${styles.modal} ${isMobile ? styles.modalMobile : ''}`}
        role="dialog"
        aria-modal="true"
        style={isMobile && dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        {isMobile ? (
          <div
            className={styles.dragHandleArea}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') {
                return;
              }
              handleDragStart(event.clientY);
            }}
            onPointerMove={(event) => {
              if (event.pointerType === 'mouse') {
                return;
              }
              handleDragMove(event.clientY);
            }}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <div className={styles.dragHandle} aria-hidden="true" />
          </div>
        ) : null}
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={translate('common.close')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
