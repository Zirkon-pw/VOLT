import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import {
  SlashCommandMenu,
  type SlashCommandMenuHandle,
} from './SlashCommandMenu';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: any, range: any) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text block',
    icon: 'file',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large heading',
    icon: 'heading',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    icon: 'heading',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    icon: 'heading',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: 'list',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: 'listOrdered',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: 'checkSquare',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Code Block',
    description: 'Code snippet',
    icon: 'code',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Blockquote',
    description: 'Quote block',
    icon: 'quote',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: 'table',
    command: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Image',
    description: 'Insert an image from file',
    icon: 'image',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent('volt:pick-image'));
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: 'minus',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

const slashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: slashCommandPluginKey,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: SlashCommandItem;
        }) => {
          props.command(editor, range);
        },
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          );
        },
        render: () => {
          let popup: HTMLDivElement | null = null;
          let root: Root | null = null;
          const menuRef = createRef<SlashCommandMenuHandle>();

          return {
            onStart: (props: any) => {
              popup = document.createElement('div');
              popup.style.position = 'absolute';
              popup.style.zIndex = '50';
              document.body.appendChild(popup);

              updatePosition(popup, props.clientRect);

              root = createRoot(popup);
              root.render(
                createElement(SlashCommandMenu, {
                  ref: menuRef,
                  items: props.items,
                  command: props.command,
                }),
              );
            },

            onUpdate: (props: any) => {
              if (!popup || !root) return;

              updatePosition(popup, props.clientRect);

              root.render(
                createElement(SlashCommandMenu, {
                  ref: menuRef,
                  items: props.items,
                  command: props.command,
                }),
              );
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                return true;
              }
              return menuRef.current?.onKeyDown(props.event) ?? false;
            },

            onExit: () => {
              root?.unmount();
              root = null;
              popup?.remove();
              popup = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

function updatePosition(
  popup: HTMLDivElement,
  clientRect: (() => DOMRect | null) | undefined,
) {
  const rect = clientRect?.();
  if (!rect) return;

  const menuHeight = 320;
  const left = rect.left;
  let top = rect.bottom + 4;

  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}
