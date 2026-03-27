package note

import (
	domain "volt/core/note"
)

type CreateDirectoryUseCase struct {
	repo domain.Repository
}

func NewCreateDirectoryUseCase(repo domain.Repository) *CreateDirectoryUseCase {
	return &CreateDirectoryUseCase{repo: repo}
}

func (uc *CreateDirectoryUseCase) Execute(voltPath, dirPath string) error {
	return uc.repo.CreateDirectory(voltPath, dirPath)
}
