package note

type Repository interface {
	ReadFile(voltPath, filePath string) (string, error)
	WriteFile(voltPath, filePath, content string) error
	ListDirectory(voltPath, dirPath string) ([]FileEntry, error)
	CreateFile(voltPath, filePath string) error
	CreateDirectory(voltPath, dirPath string) error
	DeleteFile(voltPath, filePath string) error
	RenameFile(voltPath, oldPath, newPath string) error
}
