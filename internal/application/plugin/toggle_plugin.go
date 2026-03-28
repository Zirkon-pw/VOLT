package plugin

import (
	"volt/internal/infrastructure/filesystem"
)

type TogglePluginUseCase struct {
	store *filesystem.PluginStore
}

func NewTogglePluginUseCase(store *filesystem.PluginStore) *TogglePluginUseCase {
	return &TogglePluginUseCase{store: store}
}

func (uc *TogglePluginUseCase) Execute(pluginID string, enabled bool) error {
	return uc.store.SetPluginEnabled(pluginID, enabled)
}
