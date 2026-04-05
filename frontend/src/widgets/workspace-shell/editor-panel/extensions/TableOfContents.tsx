import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './TableOfContents.module.scss';

interface TocHeading {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

interface TableOfContentsProps {
  editor: Editor;
  scrollContainer: HTMLDivElement | null;
}

function extractHeadings(editor: Editor): TocHeading[] {
  const headings: TocHeading[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') {
      return;
    }

    const level = Number(node.attrs.level);
    if (level < 1 || level > 3) {
      return;
    }

    const text = node.textContent.trim();
    if (!text) {
      return;
    }

    headings.push({
      level: level as TocHeading['level'],
      text,
      pos,
    });
  });

  return headings;
}

function getHeadingElement(editor: Editor, pos: number): HTMLElement | null {
  try {
    const nodeElement = editor.view.nodeDOM(pos);
    if (nodeElement instanceof HTMLElement && /^H[1-3]$/.test(nodeElement.tagName)) {
      return nodeElement;
    }
  } catch {
    // Ignore stale DOM lookups during editor updates.
  }

  try {
    const domAtPos = editor.view.domAtPos(Math.min(pos + 1, editor.state.doc.content.size));
    const element = domAtPos.node instanceof HTMLElement
      ? domAtPos.node
      : domAtPos.node.parentElement;
    return element?.closest('h1, h2, h3') ?? null;
  } catch {
    return null;
  }
}

export function TableOfContents({ editor, scrollContainer }: TableOfContentsProps) {
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

  const syncActiveHeading = useCallback(() => {
    if (headings.length === 0 || !scrollContainer) {
      setActivePos(headings[0]?.pos ?? null);
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const activationLine = containerRect.top + Math.min(Math.max(containerRect.height * 0.22, 48), 128);
    let nextActive = headings[0]?.pos ?? null;

    for (const heading of headings) {
      const element = getHeadingElement(editor, heading.pos);
      if (!element) {
        continue;
      }

      if (element.getBoundingClientRect().top <= activationLine) {
        nextActive = heading.pos;
      } else {
        break;
      }
    }

    setActivePos(nextActive);
  }, [editor, headings, scrollContainer]);

  const scheduleSyncActiveHeading = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      syncActiveHeading();
    });
  }, [syncActiveHeading]);

  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  useEffect(() => {
    scheduleSyncActiveHeading();
  }, [headings, scheduleSyncActiveHeading]);

  useEffect(() => {
    if (!scrollContainer) {
      return undefined;
    }

    scrollContainer.addEventListener('scroll', scheduleSyncActiveHeading, { passive: true });
    window.addEventListener('resize', scheduleSyncActiveHeading);

    return () => {
      scrollContainer.removeEventListener('scroll', scheduleSyncActiveHeading);
      window.removeEventListener('resize', scheduleSyncActiveHeading);
    };
  }, [scheduleSyncActiveHeading, scrollContainer]);

  const scrollToHeading = useCallback((pos: number) => {
    setActivePos(pos);
    editor.chain().focus().setTextSelection(pos + 1).run();

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      getHeadingElement(editor, pos)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }, [editor]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      className={styles.tocOverlay}
      aria-label="Table of contents"
      data-testid="editor-toc"
    >
      <div className={styles.tocDock}>
        <div className={styles.tocPanel} data-testid="editor-toc-panel">
          <div className={styles.tocTitle}>Contents</div>
          <ul className={styles.tocList}>
            {headings.map((heading) => {
              const isActive = activePos === heading.pos;
              const levelClass = heading.level === 2
                ? styles.tocLevel2
                : heading.level === 3
                  ? styles.tocLevel3
                  : '';

              return (
                <li key={heading.pos} className={styles.tocListItem}>
                  <button
                    type="button"
                    className={`${styles.tocItem} ${levelClass} ${isActive ? styles.tocItemActive : ''}`}
                    data-testid="editor-toc-item"
                    aria-current={isActive ? 'location' : undefined}
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
        <div className={styles.tocRail} data-testid="editor-toc-rail">
          {headings.map((heading) => {
            const isActive = activePos === heading.pos;
            return (
              <button
                key={heading.pos}
                type="button"
                className={`${styles.tocMarker} ${isActive ? styles.tocMarkerActive : ''}`}
                data-testid="editor-toc-marker"
                aria-label={heading.text}
                onClick={() => scrollToHeading(heading.pos)}
                title={heading.text}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
