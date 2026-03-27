import { useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { readNote } from '@api/note/noteApi';
import { useEditorSetup } from './hooks/useEditorSetup';
import { useAutoSave } from './hooks/useAutoSave';
import { EditorToolbar } from './components/EditorToolbar';
import styles from './EditorPanel.module.scss';

interface EditorPanelProps {
  voltId: string;
  voltPath: string;
  filePath: string | null;
}

export function EditorPanel({ voltId, voltPath, filePath }: EditorPanelProps) {
  const editor = useEditorSetup();
  const loadedPathRef = useRef<string | null>(null);

  useAutoSave({ editor, voltId, voltPath, filePath });

  useEffect(() => {
    if (!editor || !filePath) return;
    if (loadedPathRef.current === filePath) return;

    let cancelled = false;

    (async () => {
      try {
        const content = await readNote(voltPath, filePath);
        if (!cancelled) {
          editor.commands.setContent(content);
          loadedPathRef.current = filePath;
        }
      } catch (e) {
        console.error('Failed to load note:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editor, voltPath, filePath]);

  if (!filePath) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>Select a file to start editing</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <EditorToolbar editor={editor} />
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
