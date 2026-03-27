import { useEffect, useState, useCallback } from 'react';
import type { FileEntry } from '@api/note/types';
import { listTree, createNote, createDirectory, deleteNote, renameNote } from '@api/note/noteApi';
import { useTabStore } from '@app/stores/tabStore';
import { FileTreeItem } from './FileTreeItem';
import styles from './FileTree.module.scss';

interface FileTreeProps {
  voltId: string;
  voltPath: string;
}

export function FileTree({ voltId, voltPath }: FileTreeProps) {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openTab = useTabStore((s) => s.openTab);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await listTree(voltPath);
      setTree(entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [voltPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleFileClick = (filePath: string, fileName: string) => {
    openTab(voltId, filePath, fileName);
  };

  const handleNewFile = async (dirPath: string) => {
    const name = window.prompt('File name (e.g. note.md):');
    if (!name) return;
    try {
      const filePath = dirPath ? `${dirPath}/${name}` : name;
      await createNote(voltPath, filePath);
      await loadTree();
    } catch (e) {
      console.error('Failed to create file:', e);
    }
  };

  const handleNewFolder = async (dirPath: string) => {
    const name = window.prompt('Folder name:');
    if (!name) return;
    try {
      const folderPath = dirPath ? `${dirPath}/${name}` : name;
      await createDirectory(voltPath, folderPath);
      await loadTree();
    } catch (e) {
      console.error('Failed to create folder:', e);
    }
  };

  const handleDelete = async (filePath: string) => {
    const confirmed = window.confirm(`Delete "${filePath}"?`);
    if (!confirmed) return;
    try {
      await deleteNote(voltPath, filePath);
      await loadTree();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleRename = async (filePath: string) => {
    const newName = window.prompt('New name:', filePath);
    if (!newName || newName === filePath) return;
    try {
      await renameNote(voltPath, filePath, newName);
      await loadTree();
    } catch (e) {
      console.error('Failed to rename:', e);
    }
  };

  if (loading && tree.length === 0) {
    return <div className={styles.empty}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (tree.length === 0) {
    return <div className={styles.empty}>No files yet</div>;
  }

  return (
    <div className={styles.tree}>
      {tree.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          depth={0}
          onFileClick={handleFileClick}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      ))}
    </div>
  );
}
