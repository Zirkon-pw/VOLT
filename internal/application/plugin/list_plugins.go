package plugin

import (
	domain "volt/core/plugin"
	"volt/internal/infrastructure/filesystem"
)

type ListPluginsUseCase struct {
	store *filesystem.PluginStore
}

func NewListPluginsUseCase(store *filesystem.PluginStore) *ListPluginsUseCase {
	return &ListPluginsUseCase{store: store}
}

func (uc *ListPluginsUseCase) Execute() ([]domain.Plugin, error) {
	return uc.store.ListPlugins()
}
