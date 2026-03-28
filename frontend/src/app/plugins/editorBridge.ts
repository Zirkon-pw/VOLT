import type { Editor } from '@tiptap/react';

let editorInstance: Editor | null = null;

export function setEditor(editor: Editor | null): void {
  editorInstance = editor;
}

export function getEditor(): Editor | null {
  return editorInstance;
}
