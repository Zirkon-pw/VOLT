import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './TableOfContents.module.scss';

interface TocHeading {
  level: number;
  text: string;
  pos: number;
}

function extractHeadings(editor: Editor): TocHeading[] {
  const headings: TocHeading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
    }
  });
  return headings;
}

interface TableOfContentsProps {
  editor: Editor;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      setHeadings(extractHeadings(editor));
    };

    update();
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);

  useEffect(() => {
    const onSelectionUpdate = () => {
      const { from } = editor.state.selection;
      let closestPos: number | null = null;
      for (const h of headings) {
        if (h.pos <= from) {
          closestPos = h.pos;
        } else {
          break;
        }
      }
      setActivePos(closestPos);
    };

    onSelectionUpdate();
    editor.on('selectionUpdate', onSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
    };
  }, [editor, headings]);

  const scrollToHeading = useCallback((pos: number) => {
    editor.chain().focus().setTextSelection(pos + 1).run();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      try {
        const domAtPos = editor.view.domAtPos(pos + 1);
        const element = domAtPos.node instanceof HTMLElement
          ? domAtPos.node
          : domAtPos.node.parentElement;
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        // position may be invalid
      }
    });
  }, [editor]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={styles.tocSidebar}>
      <div className={styles.tocTitle}>Contents</div>
      <ul className={styles.tocList}>
        {headings.map((heading) => {
          const levelClass = heading.level === 2
            ? styles.tocLevel2
            : heading.level >= 3
              ? styles.tocLevel3
              : '';

          return (
            <li key={heading.pos}>
              <button
                type="button"
                className={`${styles.tocItem} ${levelClass} ${activePos === heading.pos ? styles.tocItemActive : ''}`}
                onClick={() => scrollToHeading(heading.pos)}
                title={heading.text}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
