package note

import (
	domain "volt/core/note"
)

type RenameNoteUseCase struct {
	repo domain.Repository
}

func NewRenameNoteUseCase(repo domain.Repository) *RenameNoteUseCase {
	return &RenameNoteUseCase{repo: repo}
}

func (uc *RenameNoteUseCase) Execute(voltPath, oldPath, newPath string) error {
	return uc.repo.RenameFile(voltPath, oldPath, newPath)
}
