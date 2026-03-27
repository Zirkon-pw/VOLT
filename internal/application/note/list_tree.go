package note

import (
	domain "volt/core/note"
)

type ListTreeUseCase struct {
	repo domain.Repository
}

func NewListTreeUseCase(repo domain.Repository) *ListTreeUseCase {
	return &ListTreeUseCase{repo: repo}
}

func (uc *ListTreeUseCase) Execute(voltPath, dirPath string) ([]domain.FileEntry, error) {
	return uc.repo.ListDirectory(voltPath, dirPath)
}
