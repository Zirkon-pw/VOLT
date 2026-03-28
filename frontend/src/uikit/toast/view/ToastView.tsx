import { useEffect, useRef } from 'react';
import type { ToastProps } from '../model/types';
import styles from './ToastView.module.scss';

export function ToastView({ toast, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.closeBtn} onClick={() => onDismiss(toast.id)}>
        &times;
      </button>
    </div>
  );
}
