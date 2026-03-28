package filesystem

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"volt/core/plugin"
)

const (
	pluginConfigDir = ".volt"
	pluginsSubDir   = "plugins"
	stateFile       = "plugin-state.json"
	manifestFile    = "manifest.json"
	dataFile        = "data.json"
)

type PluginStore struct {
	mu         sync.RWMutex
	pluginsDir string
	stateFile  string
}

func NewPluginStore() (*PluginStore, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	pluginsDir := filepath.Join(home, pluginConfigDir, pluginsSubDir)
	if err := os.MkdirAll(pluginsDir, 0755); err != nil {
		return nil, err
	}

	sf := filepath.Join(home, pluginConfigDir, stateFile)

	return &PluginStore{
		pluginsDir: pluginsDir,
		stateFile:  sf,
	}, nil
}

func (s *PluginStore) ListPlugins() ([]plugin.Plugin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entries, err := os.ReadDir(s.pluginsDir)
	if err != nil {
		return []plugin.Plugin{}, nil
	}

	state, _ := s.readState()

	var plugins []plugin.Plugin
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		dirPath := filepath.Join(s.pluginsDir, entry.Name())
		manifestPath := filepath.Join(dirPath, manifestFile)

		data, err := os.ReadFile(manifestPath)
		if err != nil {
			continue
		}

		var manifest plugin.PluginManifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			continue
		}

		enabled := state[manifest.ID]

		plugins = append(plugins, plugin.Plugin{
			Manifest: manifest,
			Enabled:  enabled,
			DirPath:  dirPath,
		})
	}

	if plugins == nil {
		plugins = []plugin.Plugin{}
	}

	return plugins, nil
}

func (s *PluginStore) LoadPluginSource(pluginID string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, err := s.findPlugin(pluginID)
	if err != nil {
		return "", err
	}

	sourcePath := filepath.Join(p.DirPath, p.Manifest.Main)
	data, err := os.ReadFile(sourcePath)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

func (s *PluginStore) SetPluginEnabled(pluginID string, enabled bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, _ := s.readState()
	if state == nil {
		state = make(map[string]bool)
	}

	state[pluginID] = enabled

	return s.writeState(state)
}

func (s *PluginStore) GetPluginData(pluginID, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dataMap, _ := s.readPluginData(pluginID)
	val, ok := dataMap[key]
	if !ok {
		return "", nil
	}
	return val, nil
}

func (s *PluginStore) SetPluginData(pluginID, key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dataMap, _ := s.readPluginData(pluginID)
	if dataMap == nil {
		dataMap = make(map[string]string)
	}

	dataMap[key] = value

	return s.writePluginData(pluginID, dataMap)
}

// --- internal helpers ---

func (s *PluginStore) readState() (map[string]bool, error) {
	data, err := os.ReadFile(s.stateFile)
	if err != nil {
		return make(map[string]bool), nil
	}
	var state map[string]bool
	if err := json.Unmarshal(data, &state); err != nil {
		return make(map[string]bool), nil
	}
	return state, nil
}

func (s *PluginStore) writeState(state map[string]bool) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.stateFile, data, 0644)
}

func (s *PluginStore) findPlugin(pluginID string) (*plugin.Plugin, error) {
	entries, err := os.ReadDir(s.pluginsDir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dirPath := filepath.Join(s.pluginsDir, entry.Name())
		manifestPath := filepath.Join(dirPath, manifestFile)

		data, err := os.ReadFile(manifestPath)
		if err != nil {
			continue
		}

		var manifest plugin.PluginManifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			continue
		}

		if manifest.ID == pluginID {
			return &plugin.Plugin{
				Manifest: manifest,
				DirPath:  dirPath,
			}, nil
		}
	}

	return nil, os.ErrNotExist
}

func (s *PluginStore) readPluginData(pluginID string) (map[string]string, error) {
	p, err := s.findPlugin(pluginID)
	if err != nil {
		return make(map[string]string), nil
	}

	dataPath := filepath.Join(p.DirPath, dataFile)
	raw, err := os.ReadFile(dataPath)
	if err != nil {
		return make(map[string]string), nil
	}

	var dataMap map[string]string
	if err := json.Unmarshal(raw, &dataMap); err != nil {
		return make(map[string]string), nil
	}

	return dataMap, nil
}

func (s *PluginStore) writePluginData(pluginID string, dataMap map[string]string) error {
	p, err := s.findPlugin(pluginID)
	if err != nil {
		return err
	}

	dataPath := filepath.Join(p.DirPath, dataFile)
	raw, err := json.MarshalIndent(dataMap, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(dataPath, raw, 0644)
}
