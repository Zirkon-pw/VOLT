package wailshandler

import (
	"context"
	"fmt"

	domain "volt/core/volt"
	appvolt "volt/internal/application/volt"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type VoltHandler struct {
	ctx         context.Context
	listVolts  *appvolt.ListVoltsUseCase
	createVolt *appvolt.CreateVoltUseCase
	deleteVolt *appvolt.DeleteVoltUseCase
}

func NewVoltHandler(
	listVolts *appvolt.ListVoltsUseCase,
	createVolt *appvolt.CreateVoltUseCase,
	deleteVolt *appvolt.DeleteVoltUseCase,
) *VoltHandler {
	return &VoltHandler{
		listVolts:  listVolts,
		createVolt: createVolt,
		deleteVolt: deleteVolt,
	}
}

func (h *VoltHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *VoltHandler) ListVolts() ([]domain.Volt, error) {
	result, err := h.listVolts.Execute()
	if err != nil {
		return nil, fmt.Errorf("failed to list volts: %w", err)
	}
	return result, nil
}

func (h *VoltHandler) CreateVolt(name, path string) (*domain.Volt, error) {
	result, err := h.createVolt.Execute(name, path)
	if err != nil {
		return nil, fmt.Errorf("failed to create volt %q: %w", name, err)
	}
	return result, nil
}

func (h *VoltHandler) DeleteVolt(id string) error {
	if err := h.deleteVolt.Execute(id); err != nil {
		return fmt.Errorf("failed to delete volt %q: %w", id, err)
	}
	return nil
}

func (h *VoltHandler) SelectDirectory() (string, error) {
	result, err := wailsRuntime.OpenDirectoryDialog(h.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select volt Directory",
	})
	if err != nil {
		return "", fmt.Errorf("failed to open directory dialog: %w", err)
	}
	return result, nil
}
