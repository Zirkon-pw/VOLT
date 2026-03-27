package note

import (
	domain "volt/core/note"
)

type ReadNoteUseCase struct {
	repo domain.Repository
}

func NewReadNoteUseCase(repo domain.Repository) *ReadNoteUseCase {
	return &ReadNoteUseCase{repo: repo}
}

func (uc *ReadNoteUseCase) Execute(voltPath, filePath string) (string, error) {
	return uc.repo.ReadFile(voltPath, filePath)
}
