import { useState } from 'react';
import type { FileEntry } from '@api/note/types';
import styles from './FileTree.module.scss';

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  onFileClick: (filePath: string, fileName: string) => void;
  onNewFile: (dirPath: string) => void;
  onNewFolder: (dirPath: string) => void;
  onDelete: (filePath: string) => void;
  onRename: (filePath: string) => void;
}

export function FileTreeItem({
  entry,
  depth,
  onFileClick,
  onNewFile,
  onNewFolder,
  onDelete,
  onRename,
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleClick = () => {
    if (entry.isDir) {
      setExpanded((prev) => !prev);
    } else {
      onFileClick(entry.path, entry.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleMenuAction = (action: () => void) => {
    action();
    closeContextMenu();
  };

  return (
    <div>
      <div
        className={styles.item}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span className={styles.icon}>
          {entry.isDir ? (expanded ? '\u{1F4C2}' : '\u{1F4C1}') : '\u{1F4C4}'}
        </span>
        <span className={styles.name}>{entry.name}</span>
      </div>

      {contextMenu && (
        <>
          <div className={styles.overlay} onClick={closeContextMenu} />
          <div
            className={styles.contextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {entry.isDir && (
              <>
                <button
                  className={styles.menuItem}
                  onClick={() => handleMenuAction(() => onNewFile(entry.path))}
                >
                  New File
                </button>
                <button
                  className={styles.menuItem}
                  onClick={() => handleMenuAction(() => onNewFolder(entry.path))}
                >
                  New Folder
                </button>
                <div className={styles.menuDivider} />
              </>
            )}
            <button
              className={styles.menuItem}
              onClick={() => handleMenuAction(() => onRename(entry.path))}
            >
              Rename
            </button>
            <button
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={() => handleMenuAction(() => onDelete(entry.path))}
            >
              Delete
            </button>
          </div>
        </>
      )}

      {entry.isDir && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
