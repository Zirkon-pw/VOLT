import { useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { saveNote } from '@api/note/noteApi';
import { useTabStore } from '@app/stores/tabStore';

interface UseAutoSaveOptions {
  editor: Editor | null;
  voltId: string;
  voltPath: string;
  filePath: string | null;
  delay?: number;
  /** Optional transform applied to markdown before saving (e.g. unresolve image URLs) */
  transformMarkdown?: (md: string) => string;
}

export function useAutoSave({
  editor,
  voltId,
  voltPath,
  filePath,
  delay = 500,
  transformMarkdown,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setDirty = useTabStore((s) => s.setDirty);

  const save = useCallback(async () => {
    if (!editor || !filePath) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let markdown = (editor.storage as any).markdown.getMarkdown();
      if (transformMarkdown) {
        markdown = transformMarkdown(markdown);
      }
      await saveNote(voltPath, filePath, markdown);
      setDirty(voltId, filePath, false);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [editor, voltPath, filePath, voltId, setDirty, transformMarkdown]);

  useEffect(() => {
    if (!editor || !filePath) return;

    const handleUpdate = () => {
      setDirty(voltId, filePath, true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        save();
      }, delay);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [editor, filePath, voltId, delay, save, setDirty]);

  return { save };
}
