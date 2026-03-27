package note

import (
	"strings"

	domain "volt/core/note"
)

type CreateNoteUseCase struct {
	repo domain.Repository
}

func NewCreateNoteUseCase(repo domain.Repository) *CreateNoteUseCase {
	return &CreateNoteUseCase{repo: repo}
}

func (uc *CreateNoteUseCase) Execute(voltPath, filePath string) error {
	if !strings.HasSuffix(filePath, ".md") {
		filePath += ".md"
	}
	return uc.repo.CreateFile(voltPath, filePath)
}
