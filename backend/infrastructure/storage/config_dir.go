package storage

import (
	"os"
	"path/filepath"
)

// GetConfigDir returns VOLT's canonical home directory.
func GetConfigDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(home, ".volt"), nil
}
