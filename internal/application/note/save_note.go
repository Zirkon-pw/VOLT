package note

import (
	domain "volt/core/note"
)

type SaveNoteUseCase struct {
	repo domain.Repository
}

func NewSaveNoteUseCase(repo domain.Repository) *SaveNoteUseCase {
	return &SaveNoteUseCase{repo: repo}
}

func (uc *SaveNoteUseCase) Execute(voltPath, filePath, content string) error {
	return uc.repo.WriteFile(voltPath, filePath, content)
}
