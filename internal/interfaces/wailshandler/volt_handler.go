package wailshandler

import (
	"context"

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
	return h.listVolts.Execute()
}

func (h *VoltHandler) CreateVolt(name, path string) (*domain.Volt, error) {
	return h.createVolt.Execute(name, path)
}

func (h *VoltHandler) DeleteVolt(id string) error {
	return h.deleteVolt.Execute(id)
}

func (h *VoltHandler) SelectDirectory() (string, error) {
	result, err := wailsRuntime.OpenDirectoryDialog(h.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select volt Directory",
	})
	if err != nil {
		return "", err
	}
	return result, nil
}
