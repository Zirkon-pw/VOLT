package wailshandler

import (
	"context"
	"fmt"

	domain "volt/core/plugin"
	appplugin "volt/internal/application/plugin"
)

type PluginHandler struct {
	ctx           context.Context
	listPlugins   *appplugin.ListPluginsUseCase
	loadPlugin    *appplugin.LoadPluginUseCase
	togglePlugin  *appplugin.TogglePluginUseCase
	getPluginData *appplugin.GetPluginDataUseCase
	setPluginData *appplugin.SetPluginDataUseCase
}

func NewPluginHandler(
	listPlugins *appplugin.ListPluginsUseCase,
	loadPlugin *appplugin.LoadPluginUseCase,
	togglePlugin *appplugin.TogglePluginUseCase,
	getPluginData *appplugin.GetPluginDataUseCase,
	setPluginData *appplugin.SetPluginDataUseCase,
) *PluginHandler {
	return &PluginHandler{
		listPlugins:   listPlugins,
		loadPlugin:    loadPlugin,
		togglePlugin:  togglePlugin,
		getPluginData: getPluginData,
		setPluginData: setPluginData,
	}
}

func (h *PluginHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *PluginHandler) ListPlugins() ([]domain.Plugin, error) {
	result, err := h.listPlugins.Execute()
	if err != nil {
		return nil, fmt.Errorf("failed to list plugins: %w", err)
	}
	return result, nil
}

func (h *PluginHandler) LoadPluginSource(pluginID string) (string, error) {
	result, err := h.loadPlugin.Execute(pluginID)
	if err != nil {
		return "", fmt.Errorf("failed to load plugin %q: %w", pluginID, err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginEnabled(pluginID string, enabled bool) error {
	if err := h.togglePlugin.Execute(pluginID, enabled); err != nil {
		return fmt.Errorf("failed to toggle plugin %q: %w", pluginID, err)
	}
	return nil
}

func (h *PluginHandler) GetPluginData(pluginID, key string) (string, error) {
	result, err := h.getPluginData.Execute(pluginID, key)
	if err != nil {
		return "", fmt.Errorf("failed to get data for plugin %q key %q: %w", pluginID, key, err)
	}
	return result, nil
}

func (h *PluginHandler) SetPluginData(pluginID, key, value string) error {
	if err := h.setPluginData.Execute(pluginID, key, value); err != nil {
		return fmt.Errorf("failed to set data for plugin %q key %q: %w", pluginID, key, err)
	}
	return nil
}
