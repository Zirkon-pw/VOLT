import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEventHandler,
  type DragEventHandler,
} from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { useFileTreeStore } from '@entities/file-tree';
import { openFileInActivePane, openFileInSecondaryPane } from '@entities/workspace-view';
import { PluginTaskStatusBanner } from '@features/plugin-task-status';
import { getFileExtension } from '@shared/lib/fileTypes';
import {
  findEntryByPath,
  resolveRelativePath,
  getParentPath,
  getPathBasename,
  getEntryDisplayName,
} from '@shared/lib/fileTree';
import { openExternalUrl } from '@shared/api/runtime/browser';
import { DragHandle } from './extensions/DragHandle';
import { EditorContextMenu } from './extensions/EditorContextMenu';
import { TableControls } from './extensions/TableControls';
import { TextBubbleMenu } from './extensions/TextBubbleMenu';
import { useEditorResponsiveMode } from './hooks/useEditorResponsiveMode';
import {
  ensureEditorSelectionForTarget,
  getEditorKeyboardMenuPosition,
  getEditorMenuContext,
  isNativeContextMenuTarget,
  type EditorMenuContext,
} from './lib/editorContext';
import styles from './MarkdownEditorSurface.module.scss';

interface MarkdownEditorSurfaceProps {
  editor: Editor | null;
  voltId?: string;
  voltPath: string;
  filePath: string;
  readOnly?: boolean;
  showTaskStatusBanner?: boolean;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onPaste?: ClipboardEventHandler<HTMLDivElement>;
}

export function MarkdownEditorSurface({
  editor,
  voltId,
  voltPath,
  filePath,
  readOnly = false,
  showTaskStatusBanner = false,
  onDrop,
  onDragOver,
  onPaste,
}: MarkdownEditorSurfaceProps) {
  const [editorContentElement, setEditorContentElement] = useState<HTMLDivElement | null>(null);
  const [overlayElement, setOverlayElement] = useState<HTMLDivElement | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    context: EditorMenuContext;
    position: { x: number; y: number };
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const responsiveMode = useEditorResponsiveMode({ element: editorContentElement });

  const isWithinEditorSurfaceTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) {
      return false;
    }

    return Boolean(
      (editorContentElement && editorContentElement.contains(target))
      || (overlayElement && overlayElement.contains(target)),
    );
  }, [editorContentElement, overlayElement]);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const openContextMenu = useCallback((position: { x: number; y: number }, target: EventTarget | null) => {
    if (!editor || !isWithinEditorSurfaceTarget(target) || isNativeContextMenuTarget(target)) {
      return;
    }

    ensureEditorSelectionForTarget(editor, {
      target,
      clientX: position.x,
      clientY: position.y,
    });

    setContextMenuState({
      context: getEditorMenuContext(editor, {
        target,
        clientX: position.x,
        clientY: position.y,
      }),
      position,
    });
  }, [editor, isWithinEditorSurfaceTarget]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPointRef.current = null;
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  useEffect(() => {
    if (!editor || contextMenuState == null) {
      return undefined;
    }

    const handleSelectionChange = () => {
      closeContextMenu();
    };

    const handleResize = () => {
      closeContextMenu();
    };

    const container = editorContentElement;
    editor.on('selectionUpdate', handleSelectionChange);
    editor.on('update', handleSelectionChange);
    container?.addEventListener('scroll', handleResize, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
      editor.off('update', handleSelectionChange);
      container?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [closeContextMenu, contextMenuState, editor, editorContentElement]);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target;
      const anchor = target instanceof Element
        ? target.closest('a[href]')
        : target instanceof Node
          ? target.parentElement?.closest('a[href]')
          : null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      const isExternalLink = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)
        || /^[a-z][a-z0-9+.-]*:/i.test(href);

      e.preventDefault();
      e.stopPropagation();

      if (isExternalLink) {
        openExternalUrl(href);
        return;
      }

      if (!voltId || href.startsWith('#')) return;

      const normalizedHref = decodeURIComponent(href.split(/[?#]/, 1)[0] ?? href);
      if (!normalizedHref) {
        return;
      }

      const resolvedPath = resolveRelativePath(getParentPath(filePath), normalizedHref);
      const tree = useFileTreeStore.getState().trees[voltId] ?? [];
      const markdownFallbackPath = getFileExtension(resolvedPath) ? resolvedPath : `${resolvedPath}.md`;
      const targetPath = findEntryByPath(tree, resolvedPath)
        ? resolvedPath
        : findEntryByPath(tree, markdownFallbackPath)
          ? markdownFallbackPath
          : resolvedPath;
      const displayName = getEntryDisplayName(getPathBasename(targetPath), false);

      const shouldOpenSecondary = e.metaKey || e.ctrlKey;
      if (shouldOpenSecondary) {
        openFileInSecondaryPane(voltId, targetPath, displayName);
      } else {
        openFileInActivePane(voltId, targetPath, displayName);
      }
    },
    [voltId, filePath],
  );

  const panelProps = useMemo(() => ({
    'data-editor-mode': responsiveMode,
  }), [responsiveMode]);

  return (
    <div
      className={styles.panel}
      data-testid="markdown-editor-surface"
      {...panelProps}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      onClickCapture={handleLinkClick}
      onContextMenu={(event) => {
        if (!isWithinEditorSurfaceTarget(event.target) || isNativeContextMenuTarget(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        openContextMenu({ x: event.clientX, y: event.clientY }, event.target);
      }}
      onKeyDownCapture={(event) => {
        if (!editor || isNativeContextMenuTarget(event.target) || !isWithinEditorSurfaceTarget(event.target)) {
          return;
        }

        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        openContextMenu(getEditorKeyboardMenuPosition(editor), event.target);
      }}
      onPointerDownCapture={(event) => {
        if (responsiveMode !== 'touch' || event.pointerType === 'mouse') {
          return;
        }

        if (!isWithinEditorSurfaceTarget(event.target) || isNativeContextMenuTarget(event.target)) {
          return;
        }

        longPressTriggeredRef.current = false;
        clearLongPress();
        longPressPointRef.current = { x: event.clientX, y: event.clientY };
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          openContextMenu({ x: event.clientX, y: event.clientY }, event.target);
        }, 420);
      }}
      onPointerMoveCapture={(event) => {
        if (responsiveMode !== 'touch' || longPressPointRef.current == null) {
          return;
        }

        const deltaX = Math.abs(event.clientX - longPressPointRef.current.x);
        const deltaY = Math.abs(event.clientY - longPressPointRef.current.y);
        if (deltaX > 12 || deltaY > 12) {
          clearLongPress();
        }
      }}
      onPointerUpCapture={() => {
        clearLongPress();
      }}
      onPointerCancelCapture={() => {
        clearLongPress();
      }}
    >
      {editor && (
        <TextBubbleMenu editor={editor} mode={responsiveMode} />
      )}
      {showTaskStatusBanner && <PluginTaskStatusBanner voltPath={voltPath} filePath={filePath} />}
      <div ref={setEditorContentElement} className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
      {editor && contextMenuState && (
        <EditorContextMenu
          editor={editor}
          context={contextMenuState.context}
          position={contextMenuState.position}
          onClose={closeContextMenu}
        />
      )}
      {!readOnly && editor && (
        <div ref={setOverlayElement} className={styles.editorOverlay}>
          <TableControls
            editor={editor}
            scrollContainer={editorContentElement}
            overlayContainer={overlayElement}
            mode={responsiveMode}
          />
          <DragHandle
            editor={editor}
            scrollContainer={editorContentElement}
            overlayContainer={overlayElement}
          />
        </div>
      )}
    </div>
  );
}
