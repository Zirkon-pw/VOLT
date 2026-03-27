package note

type FileEntry struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []FileEntry `json:"children,omitempty"`
}

type Note struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
}
