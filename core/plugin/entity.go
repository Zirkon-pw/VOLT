package plugin

type PluginManifest struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Version     string   `json:"version"`
	Description string   `json:"description"`
	Main        string   `json:"main"`
	Permissions []string `json:"permissions"`
}

type Plugin struct {
	Manifest PluginManifest `json:"manifest"`
	Enabled  bool           `json:"enabled"`
	DirPath  string         `json:"dirPath"`
}
