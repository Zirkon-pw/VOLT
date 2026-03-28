package plugin

import (
	"volt/internal/infrastructure/filesystem"
)

type GetPluginDataUseCase struct {
	store *filesystem.PluginStore
}

func NewGetPluginDataUseCase(store *filesystem.PluginStore) *GetPluginDataUseCase {
	return &GetPluginDataUseCase{store: store}
}

func (uc *GetPluginDataUseCase) Execute(pluginID, key string) (string, error) {
	return uc.store.GetPluginData(pluginID, key)
}

type SetPluginDataUseCase struct {
	store *filesystem.PluginStore
}

func NewSetPluginDataUseCase(store *filesystem.PluginStore) *SetPluginDataUseCase {
	return &SetPluginDataUseCase{store: store}
}

func (uc *SetPluginDataUseCase) Execute(pluginID, key, value string) error {
	return uc.store.SetPluginData(pluginID, key, value)
}
