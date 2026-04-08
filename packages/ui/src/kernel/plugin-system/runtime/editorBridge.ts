import type { Editor } from '@tiptap/react';

interface EditorBridgeState {
  editor: Editor | null;
  voltId: string | null;
  locator: string | null;
  filePath: string | null;
}

type EditorBridgeListener = (state: EditorBridgeState) => void;

let editorState: EditorBridgeState = {
  editor: null,
  voltId: null,
  locator: null,
  filePath: null,
};
const listeners = new Set<EditorBridgeListener>();

export function setEditor(
  editor: Editor | null,
  context?: {
    voltId: string;
    locator: string;
    filePath: string | null;
  },
): void {
  editorState = {
    editor,
    voltId: context?.voltId ?? null,
    locator: context?.locator ?? null,
    filePath: context?.filePath ?? null,
  };
  for (const listener of listeners) {
    listener(editorState);
  }
}

export function getEditor(): Editor | null {
  return editorState.editor;
}

export function getEditorState(): EditorBridgeState {
  return editorState;
}

export function subscribeToEditorState(listener: EditorBridgeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
