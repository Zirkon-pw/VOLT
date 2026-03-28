import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Icon } from '@uikit/icon';
import styles from './TableBubbleMenu.module.scss';

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => ed.isActive('table')}
    >
      <div className={styles.menu}>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Add column before"
        >
          <Icon name="plus" size={14} />
          <span>Col&#8592;</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Add column after"
        >
          <Icon name="plus" size={14} />
          <span>Col&#8594;</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Delete column"
        >
          <Icon name="trash" size={14} />
          <span>Col</span>
        </button>
        <div className={styles.divider} />
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Add row above"
        >
          <Icon name="plus" size={14} />
          <span>Row&#8593;</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Add row below"
        >
          <Icon name="plus" size={14} />
          <span>Row&#8595;</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Delete row"
        >
          <Icon name="trash" size={14} />
          <span>Row</span>
        </button>
        <div className={styles.divider} />
        <button
          className={styles.btnDanger}
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="Delete table"
        >
          <Icon name="trash" size={14} />
          <span>Table</span>
        </button>
      </div>
    </BubbleMenu>
  );
}
