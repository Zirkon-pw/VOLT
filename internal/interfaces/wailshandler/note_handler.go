package wailshandler

import (
	"context"

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
	return h.readNote.Execute(voltPath, filePath)
}

func (h *NoteHandler) SaveNote(voltPath, filePath, content string) error {
	return h.saveNote.Execute(voltPath, filePath, content)
}

func (h *NoteHandler) ListTree(voltPath, dirPath string) ([]domain.FileEntry, error) {
	return h.listTree.Execute(voltPath, dirPath)
}

func (h *NoteHandler) CreateNote(voltPath, filePath string) error {
	return h.createNote.Execute(voltPath, filePath)
}

func (h *NoteHandler) CreateDirectory(voltPath, dirPath string) error {
	return h.createDirectory.Execute(voltPath, dirPath)
}

func (h *NoteHandler) DeleteNote(voltPath, filePath string) error {
	return h.deleteNote.Execute(voltPath, filePath)
}

func (h *NoteHandler) RenameNote(voltPath, oldPath, newPath string) error {
	return h.renameNote.Execute(voltPath, oldPath, newPath)
}
