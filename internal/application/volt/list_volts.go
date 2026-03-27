package volt

import (
	domain "volt/core/volt"
)

type ListVoltsUseCase struct {
	repo domain.Repository
}

func NewListVoltsUseCase(repo domain.Repository) *ListVoltsUseCase {
	return &ListVoltsUseCase{repo: repo}
}

func (uc *ListVoltsUseCase) Execute() ([]domain.Volt, error) {
	return uc.repo.List()
}
