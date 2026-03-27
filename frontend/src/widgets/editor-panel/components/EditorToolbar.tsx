import type { Editor } from '@tiptap/react';
import styles from './EditorToolbar.module.scss';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButton {
  label: string;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

const buttons: ToolbarButton[] = [
  {
    label: 'B',
    action: (ed) => ed.chain().focus().toggleBold().run(),
    isActive: (ed) => ed.isActive('bold'),
  },
  {
    label: 'I',
    action: (ed) => ed.chain().focus().toggleItalic().run(),
    isActive: (ed) => ed.isActive('italic'),
  },
  {
    label: 'S',
    action: (ed) => ed.chain().focus().toggleStrike().run(),
    isActive: (ed) => ed.isActive('strike'),
  },
  {
    label: 'H1',
    action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (ed) => ed.isActive('heading', { level: 1 }),
  },
  {
    label: 'H2',
    action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (ed) => ed.isActive('heading', { level: 2 }),
  },
  {
    label: 'H3',
    action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (ed) => ed.isActive('heading', { level: 3 }),
  },
  {
    label: '\u2022',
    action: (ed) => ed.chain().focus().toggleBulletList().run(),
    isActive: (ed) => ed.isActive('bulletList'),
  },
  {
    label: '1.',
    action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    isActive: (ed) => ed.isActive('orderedList'),
  },
  {
    label: '\u2611',
    action: (ed) => ed.chain().focus().toggleTaskList().run(),
    isActive: (ed) => ed.isActive('taskList'),
  },
  {
    label: '</>',
    action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    isActive: (ed) => ed.isActive('codeBlock'),
  },
  {
    label: '\u201C',
    action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    isActive: (ed) => ed.isActive('blockquote'),
  },
  {
    label: '\u{1F517}',
    action: (ed) => {
      const url = window.prompt('URL:');
      if (url) {
        ed.chain().focus().setLink({ href: url }).run();
      }
    },
    isActive: (ed) => ed.isActive('link'),
  },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          className={`${styles.btn} ${btn.isActive?.(editor) ? styles.active : ''}`}
          onClick={() => btn.action(editor)}
          type="button"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
