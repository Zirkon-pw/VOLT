package volt

import (
	"os"
	"time"

	"github.com/google/uuid"

	domain "volt/core/volt"
)

type CreateVoltUseCase struct {
	repo domain.Repository
}

func NewCreateVoltUseCase(repo domain.Repository) *CreateVoltUseCase {
	return &CreateVoltUseCase{repo: repo}
}

func (uc *CreateVoltUseCase) Execute(name, path string) (*domain.Volt, error) {
	// Validate that the path exists and is accessible
	info, err := os.Stat(path)
	if err != nil {
		return nil, domain.ErrPathNotAccessible
	}
	if !info.IsDir() {
		return nil, domain.ErrPathNotAccessible
	}

	// Check write access by attempting to create a temp file
	testFile := path + "/.volt_write_test"
	f, err := os.Create(testFile)
	if err != nil {
		return nil, domain.ErrPathNotAccessible
	}
	f.Close()
	os.Remove(testFile)

	v := &domain.Volt{
		ID:        uuid.New().String(),
		Name:      name,
		Path:      path,
		CreatedAt: time.Now(),
	}

	if err := uc.repo.Create(v); err != nil {
		return nil, err
	}

	return v, nil
}
