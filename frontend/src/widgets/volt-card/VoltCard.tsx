import { Volt } from '@api/volt/types';
import { Icon } from '@uikit/icon';
import styles from './VoltCard.module.scss';

interface VoltCardProps {
  volt: Volt;
  onDelete: (id: string) => void;
  onOpen: (volt: Volt) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function VoltCard({ volt, onDelete, onOpen }: VoltCardProps) {
  const handleClick = () => {
    onOpen(volt);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(volt.id);
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        aria-label="Delete volt"
      >
        <Icon name="close" size={14} />
      </button>
      <span className={styles.name}>{volt.name}</span>
      <span className={styles.path} title={volt.path}>
        {volt.path}
      </span>
      <span className={styles.date}>{formatDate(volt.createdAt)}</span>
    </div>
  );
}
