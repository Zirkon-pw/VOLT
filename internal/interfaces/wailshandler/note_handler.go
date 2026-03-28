package wailshandler

import (
	"context"
	"fmt"

	domain "volt/core/note"
	appnote "volt/internal/application/note"
)

type NoteHandler struct {
	ctx             context.Context
	readNote        *appnote.ReadNoteUseCase
	saveNote        *appnote.SaveNoteUseCase
	listTree        *appnote.ListTreeUseCase
	createNote      *appnote.CreateNoteUseCase
	createDirectory *appnote.CreateDirectoryUseCase
	deleteNote      *appnote.DeleteNoteUseCase
	renameNote      *appnote.RenameNoteUseCase
}

func NewNoteHandler(
	readNote *appnote.ReadNoteUseCase,
	saveNote *appnote.SaveNoteUseCase,
	listTree *appnote.ListTreeUseCase,
	createNote *appnote.CreateNoteUseCase,
	createDirectory *appnote.CreateDirectoryUseCase,
	deleteNote *appnote.DeleteNoteUseCase,
	renameNote *appnote.RenameNoteUseCase,
) *NoteHandler {
	return &NoteHandler{
		readNote:        readNote,
		saveNote:        saveNote,
		listTree:        listTree,
		createNote:      createNote,
		createDirectory: createDirectory,
		deleteNote:      deleteNote,
		renameNote:      renameNote,
	}
}

func (h *NoteHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *NoteHandler) ReadNote(voltPath, filePath string) (string, error) {
	result, err := h.readNote.Execute(voltPath, filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read note %q: %w", filePath, err)
	}
	return result, nil
}

func (h *NoteHandler) SaveNote(voltPath, filePath, content string) error {
	if err := h.saveNote.Execute(voltPath, filePath, content); err != nil {
		return fmt.Errorf("failed to save note %q: %w", filePath, err)
	}
	return nil
}

func (h *NoteHandler) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	result, err := h.listTree.Execute(voltPath, dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list tree at %q: %w", dirPath, err)
	}
	return result, nil
}

func (h *NoteHandler) CreateNote(voltPath, filePath string) error {
	if err := h.createNote.Execute(voltPath, filePath); err != nil {
		return fmt.Errorf("failed to create note %q: %w", filePath, err)
	}
	return nil
}

func (h *NoteHandler) CreateDirectory(voltPath, dirPath string) error {
	if err := h.createDirectory.Execute(voltPath, dirPath); err != nil {
		return fmt.Errorf("failed to create directory %q: %w", dirPath, err)
	}
	return nil
}

func (h *NoteHandler) DeleteNote(voltPath, filePath string) error {
	if err := h.deleteNote.Execute(voltPath, filePath); err != nil {
		return fmt.Errorf("failed to delete note %q: %w", filePath, err)
	}
	return nil
}

func (h *NoteHandler) RenameNote(voltPath, oldPath, newPath string) error {
	if err := h.renameNote.Execute(voltPath, oldPath, newPath); err != nil {
		return fmt.Errorf("failed to rename note from %q to %q: %w", oldPath, newPath, err)
	}
	return nil
}
