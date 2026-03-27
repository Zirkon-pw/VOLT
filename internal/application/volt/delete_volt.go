package volt

import (
	domain "volt/core/volt"
)

type DeleteVoltUseCase struct {
	repo domain.Repository
}

func NewDeleteVoltUseCase(repo domain.Repository) *DeleteVoltUseCase {
	return &DeleteVoltUseCase{repo: repo}
}

// Execute removes the volt from the registry.
// It NEVER deletes user files from disk.
func (uc *DeleteVoltUseCase) Execute(id string) error {
	return uc.repo.Delete(id)
}
