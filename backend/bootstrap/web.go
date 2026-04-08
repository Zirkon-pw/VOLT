package bootstrap

import (
	"log"
	"path/filepath"

	appfile "volt/backend/application/file"
	appstorage "volt/backend/application/storage"
	infrafilesystem "volt/backend/infrastructure/filesystem"
	infrastorage "volt/backend/infrastructure/storage"
	httpapi "volt/backend/interfaces/http"
)

type WebContainer struct {
	Server *httpapi.Server
}

func NewWebContainer(password string) *WebContainer {
	fileRepo := infrafilesystem.NewFileRepository()
	kvRepo, err := infrastorage.NewJSONKVRepository()
	if err != nil {
		log.Fatalf("failed to initialize KV repository: %v", err)
	}

	fileService := appfile.NewService(fileRepo)
	storageService := appstorage.NewService(kvRepo)

	return &WebContainer{
		Server: httpapi.NewServer(
			fileService,
			storageService,
			password,
			filepath.Join("packages", "web-shell", "dist"),
		),
	}
}
