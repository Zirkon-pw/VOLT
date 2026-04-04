import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { CellSelection, findCellPos } from '@tiptap/pm/tables';
import { openExternalUrl } from '@shared/api/runtime/browser';
import { translate } from '@shared/i18n';
import { formatShortcutBinding } from '@shared/lib/hotkeys';
import { ContextMenu, type ContextMenuItem } from '@shared/ui/context-menu';
import type { EditorMenuContext } from '../lib/editorContext';

const TABLE_COLOR_PRESETS = [
  { label: 'None', value: null },
  { label: 'Gray', value: '#f3f4f6' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Yellow', value: '#fef9c3' },
];

interface EditorContextMenuProps {
  editor: Editor;
  context: EditorMenuContext;
  position: { x: number; y: number };
  onClose: () => void;
}

export function EditorContextMenu({
  editor,
  context,
  position,
  onClose,
}: EditorContextMenuProps) {
  const items = useMemo(
    () => buildEditorContextMenuItems(editor, context),
    [context, editor],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <ContextMenu
      items={items}
      position={position}
      presentation="popover"
      onClose={onClose}
    />
  );
}

function buildEditorContextMenuItems(editor: Editor, context: EditorMenuContext) {
  const items: ContextMenuItem[] = [];

  pushGroup(items, buildHistoryItems(editor));
  pushGroup(items, buildClipboardItems(editor));

  if (context.canFormat || context.hasSelection || context.isInLink) {
    pushGroup(items, buildFormattingItems(editor, context));
  }

  pushGroup(items, buildNodeSpecificItems(editor, context));

  return trimSeparators(items);
}

function buildHistoryItems(editor: Editor): ContextMenuItem[] {
  return [
    {
      label: translate('common.undo'),
      icon: 'arrowLeft',
      shortcut: formatShortcutBinding('Mod+Z'),
      disabled: !editor.isEditable || !editor.can().chain().focus().undo().run(),
      onClick: () => {
        editor.chain().focus().undo().run();
      },
    },
    {
      label: translate('common.redo'),
      icon: 'arrowRight',
      shortcut: formatShortcutBinding('Shift+Mod+Z'),
      disabled: !editor.isEditable || !editor.can().chain().focus().redo().run(),
      onClick: () => {
        editor.chain().focus().redo().run();
      },
    },
  ];
}

function buildClipboardItems(editor: Editor): ContextMenuItem[] {
  const selectionText = getSelectionText(editor);
  const canReadClipboard = Boolean(globalThis.navigator?.clipboard?.readText);
  const canWriteClipboard = Boolean(globalThis.navigator?.clipboard?.writeText);

  return [
    {
      label: translate('common.copy'),
      shortcut: formatShortcutBinding('Mod+C'),
      disabled: selectionText.length === 0 || !canWriteClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.writeText(selectionText);
      },
    },
    {
      label: translate('common.cut'),
      shortcut: formatShortcutBinding('Mod+X'),
      disabled: selectionText.length === 0 || !editor.isEditable || !canWriteClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.writeText(selectionText);
        editor.chain().focus().deleteSelection().run();
      },
    },
    {
      label: translate('common.paste'),
      shortcut: formatShortcutBinding('Mod+V'),
      disabled: !editor.isEditable || !canReadClipboard,
      onClick: () => {
        void globalThis.navigator?.clipboard?.readText().then((text) => {
          if (!text) {
            return;
          }
          editor.chain().focus().insertContent(text).run();
        });
      },
    },
    {
      label: translate('common.selectAll'),
      shortcut: formatShortcutBinding('Mod+A'),
      disabled: !editor.can().chain().focus().selectAll().run(),
      onClick: () => {
        editor.chain().focus().selectAll().run();
      },
    },
  ];
}

function buildFormattingItems(editor: Editor, context: EditorMenuContext): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      label: translate('editor.context.bold'),
      icon: 'bold',
      shortcut: formatShortcutBinding('Mod+B'),
      active: editor.isActive('bold'),
      disabled: !editor.isEditable || !editor.can().chain().focus().toggleBold().run(),
      onClick: () => {
        editor.chain().focus().toggleBold().run();
      },
    },
    {
      label: translate('editor.context.italic'),
      icon: 'italic',
      shortcut: formatShortcutBinding('Mod+I'),
      active: editor.isActive('italic'),
      disabled: !editor.isEditable || !editor.can().chain().focus().toggleItalic().run(),
      onClick: () => {
        editor.chain().focus().toggleItalic().run();
      },
    },
    {
      label: translate('editor.context.underline'),
      icon: {
        svg: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 4v6a6 6 0 0 0 12 0V4" />
            <path d="M4 20h16" />
          </svg>
        `,
      },
      shortcut: formatShortcutBinding('Mod+U'),
      active: editor.isActive('underline'),
      disabled: !editor.isEditable || !editor.can().chain().focus().toggleUnderline().run(),
      onClick: () => {
        editor.chain().focus().toggleUnderline().run();
      },
    },
    {
      label: translate('editor.context.strikethrough'),
      icon: 'strikethrough',
      active: editor.isActive('strike'),
      disabled: !editor.isEditable || !editor.can().chain().focus().toggleStrike().run(),
      onClick: () => {
        editor.chain().focus().toggleStrike().run();
      },
    },
  ];

  if (context.isInLink || context.nodeKind === 'link') {
    const href = context.linkHref ?? '';
    const isExternalLink = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href);

    items.push({
      label: translate('editor.context.copyLink'),
      icon: 'link',
      disabled: href.length === 0 || !globalThis.navigator?.clipboard?.writeText,
      onClick: () => {
        if (!href) {
          return;
        }
        void globalThis.navigator?.clipboard?.writeText(href);
      },
    });

    if (isExternalLink) {
      items.push({
        label: translate('editor.context.openLink'),
        icon: 'arrowRight',
        disabled: href.length === 0,
        onClick: () => {
          if (!href) {
            return;
          }
          openExternalUrl(href);
        },
      });
    }

    items.push({
      label: translate('editor.link.remove'),
      icon: 'close',
      disabled: !editor.isEditable || !editor.can().chain().focus().unsetLink().run(),
      onClick: () => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      },
    });
  } else {
    items.push({
      label: translate('editor.context.addLink'),
      icon: 'link',
      disabled: !editor.isEditable,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('volt:pick-link'));
      },
    });
  }

  return items;
}

function buildNodeSpecificItems(editor: Editor, context: EditorMenuContext): ContextMenuItem[] {
  if (context.tableState.active) {
    return buildTableItems(editor, context);
  }

  const items: ContextMenuItem[] = [];

  if (context.nodeKind === 'codeBlock') {
    items.push({
      label: translate('editor.context.plainText'),
      icon: 'file',
      disabled: !editor.isEditable || !editor.can().chain().focus().setParagraph().run(),
      onClick: () => {
        editor.chain().focus().setParagraph().run();
      },
    });
  }

  if (context.nodeKind === 'image' || context.nodeKind === 'embed' || context.nodeKind === 'math') {
    items.push({
      label: translate('common.delete'),
      icon: 'trash',
      danger: true,
      disabled: !editor.isEditable || !editor.can().chain().focus().deleteSelection().run(),
      onClick: () => {
        editor.chain().focus().deleteSelection().run();
      },
    });
  }

  return items;
}

function buildTableItems(editor: Editor, context: EditorMenuContext): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  const targetPos = context.targetPos ?? editor.state.selection.from;
  const currentColor = editor.getAttributes('tableCell').backgroundColor
    ?? editor.getAttributes('tableHeader').backgroundColor
    ?? null;

  items.push(
    {
      label: translate('editor.table.selectRow'),
      icon: 'rows',
      disabled: !editor.isEditable,
      onClick: () => {
        selectTableAxis(editor, targetPos, 'row');
      },
    },
    {
      label: translate('editor.table.selectColumn'),
      icon: 'columns',
      disabled: !editor.isEditable,
      onClick: () => {
        selectTableAxis(editor, targetPos, 'col');
      },
    },
    {
      label: translate('editor.table.selectTable'),
      icon: 'table',
      disabled: !editor.isEditable || !editor.can().chain().focus().selectParentNode().run(),
      onClick: () => {
        editor.chain().focus().selectParentNode().run();
      },
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: translate('editor.table.addColumnBefore'),
      icon: 'columns',
      disabled: !editor.isEditable || !editor.can().chain().focus().addColumnBefore().run(),
      onClick: () => {
        editor.chain().focus().addColumnBefore().run();
      },
    },
    {
      label: translate('editor.table.addColumnAfter'),
      icon: 'columns',
      disabled: !editor.isEditable || !editor.can().chain().focus().addColumnAfter().run(),
      onClick: () => {
        editor.chain().focus().addColumnAfter().run();
      },
    },
    {
      label: translate('editor.table.addRowAbove'),
      icon: 'rows',
      disabled: !editor.isEditable || !editor.can().chain().focus().addRowBefore().run(),
      onClick: () => {
        editor.chain().focus().addRowBefore().run();
      },
    },
    {
      label: translate('editor.table.addRowBelow'),
      icon: 'rows',
      disabled: !editor.isEditable || !editor.can().chain().focus().addRowAfter().run(),
      onClick: () => {
        editor.chain().focus().addRowAfter().run();
      },
    },
    {
      label: translate('editor.table.deleteColumn'),
      icon: 'columns',
      danger: true,
      disabled: !editor.isEditable || !editor.can().chain().focus().deleteColumn().run(),
      onClick: () => {
        editor.chain().focus().deleteColumn().run();
      },
    },
    {
      label: translate('editor.table.deleteRow'),
      icon: 'rows',
      danger: true,
      disabled: !editor.isEditable || !editor.can().chain().focus().deleteRow().run(),
      onClick: () => {
        editor.chain().focus().deleteRow().run();
      },
    },
  );

  items.push({ label: '', separator: true, onClick: () => {} });

  for (const preset of TABLE_COLOR_PRESETS) {
    items.push({
      label: preset.value == null
        ? translate('editor.table.clearCellColor')
        : `${translate('editor.table.cellColor')}: ${preset.label}`,
      icon: 'paintBucket',
      active: currentColor === preset.value,
      disabled: !editor.isEditable,
      onClick: () => {
        editor.chain().focus().setCellAttribute('backgroundColor', preset.value).run();
      },
    });
  }

  items.push(
    { label: '', separator: true, onClick: () => {} },
    {
      label: translate('editor.table.deleteTable'),
      icon: 'trash',
      danger: true,
      disabled: !editor.isEditable || !editor.can().chain().focus().deleteTable().run(),
      onClick: () => {
        editor.chain().focus().deleteTable().run();
      },
    },
  );

  return items;
}

function pushGroup(target: ContextMenuItem[], group: ContextMenuItem[]) {
  const filtered = group.filter((item) => item.separator || item.label.length > 0);
  if (filtered.length === 0) {
    return;
  }

  if (target.length > 0) {
    target.push({ label: '', separator: true, onClick: () => {} });
  }

  target.push(...filtered);
}

function trimSeparators(items: ContextMenuItem[]) {
  return items.filter((item, index) => {
    if (!item.separator) {
      return true;
    }

    const prev = items[index - 1];
    const next = items[index + 1];
    return Boolean(prev && next && !prev.separator && !next.separator);
  });
}

function getSelectionText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, ' ').trim();
}

function selectTableAxis(editor: Editor, pos: number, axis: 'row' | 'col') {
  try {
    const $cell = findCellPos(editor.state.doc, pos);
    if (!$cell) {
      return;
    }

    const selection = axis === 'row'
      ? CellSelection.rowSelection($cell)
      : CellSelection.colSelection($cell);

    editor.view.dispatch(editor.state.tr.setSelection(selection));
    editor.view.focus();
  } catch {
    editor.chain().focus().run();
  }
}
