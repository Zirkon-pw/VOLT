package plugin

import (
	"volt/internal/infrastructure/filesystem"
)

type LoadPluginUseCase struct {
	store *filesystem.PluginStore
}

func NewLoadPluginUseCase(store *filesystem.PluginStore) *LoadPluginUseCase {
	return &LoadPluginUseCase{store: store}
}

func (uc *LoadPluginUseCase) Execute(pluginID string) (string, error) {
	return uc.store.LoadPluginSource(pluginID)
}
