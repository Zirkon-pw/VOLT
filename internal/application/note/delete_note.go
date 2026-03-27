package note

import (
	domain "volt/core/note"
)

type DeleteNoteUseCase struct {
	repo domain.Repository
}

func NewDeleteNoteUseCase(repo domain.Repository) *DeleteNoteUseCase {
	return &DeleteNoteUseCase{repo: repo}
}

func (uc *DeleteNoteUseCase) Execute(voltPath, filePath string) error {
	return uc.repo.DeleteFile(voltPath, filePath)
}
