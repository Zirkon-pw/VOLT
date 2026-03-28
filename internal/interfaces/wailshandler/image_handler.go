package wailshandler

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ImageHandler struct {
	ctx context.Context
}

func NewImageHandler() *ImageHandler {
	return &ImageHandler{}
}

func (h *ImageHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

// CopyImage copies an image from sourcePath into the vault's image directory.
// Returns the relative path to the copied image (relative to voltPath).
func (h *ImageHandler) CopyImage(voltPath, sourcePath, imageDir string) (string, error) {
	if imageDir == "" {
		imageDir = "attachments"
	}

	destDir := filepath.Join(voltPath, imageDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create image directory: %w", err)
	}

	ext := filepath.Ext(sourcePath)
	baseName := strings.TrimSuffix(filepath.Base(sourcePath), ext)
	destName := baseName + ext

	destPath := filepath.Join(destDir, destName)
	// If file exists, add timestamp
	if _, err := os.Stat(destPath); err == nil {
		destName = fmt.Sprintf("%s_%d%s", baseName, time.Now().UnixMilli(), ext)
		destPath = filepath.Join(destDir, destName)
	}

	src, err := os.Open(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to open source image: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to copy image: %w", err)
	}

	relPath := filepath.Join(imageDir, destName)
	return relPath, nil
}

// SaveImageBase64 saves base64-encoded image data to the vault's image directory.
// Used for drag-and-drop and clipboard paste where we don't have a file path.
// Returns the relative path to the saved image.
func (h *ImageHandler) SaveImageBase64(voltPath, fileName, imageDir, b64Data string) (string, error) {
	if imageDir == "" {
		imageDir = "attachments"
	}

	destDir := filepath.Join(voltPath, imageDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create image directory: %w", err)
	}

	data, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64 data: %w", err)
	}

	ext := filepath.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, ext)
	if ext == "" {
		ext = ".png"
	}
	destName := baseName + ext

	destPath := filepath.Join(destDir, destName)
	if _, err := os.Stat(destPath); err == nil {
		destName = fmt.Sprintf("%s_%d%s", baseName, time.Now().UnixMilli(), ext)
		destPath = filepath.Join(destDir, destName)
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	relPath := filepath.Join(imageDir, destName)
	return relPath, nil
}

// PickImage opens a native file dialog and returns the selected image path.
// Returns empty string if cancelled.
func (h *ImageHandler) PickImage() (string, error) {
	selection, err := runtime.OpenFileDialog(h.ctx, runtime.OpenDialogOptions{
		Title: "Select Image",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Images (*.png, *.jpg, *.jpeg, *.gif, *.webp, *.svg)",
				Pattern:     "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg",
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("file dialog failed: %w", err)
	}
	return selection, nil
}

// ReadImageBase64 reads an image file from the vault and returns it as a data URL.
// Format: "data:<mime>;base64,<data>"
func (h *ImageHandler) ReadImageBase64(voltPath, relPath string) (string, error) {
	clean := filepath.Clean(relPath)
	if strings.Contains(clean, "..") {
		return "", fmt.Errorf("invalid path: contains '..'")
	}

	fullPath := filepath.Join(voltPath, clean)

	absVault, err := filepath.Abs(voltPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve vault path: %w", err)
	}
	absFile, err := filepath.Abs(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve file path: %w", err)
	}
	if !strings.HasPrefix(absFile, absVault) {
		return "", fmt.Errorf("path traversal detected")
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	ct := mime.TypeByExtension(filepath.Ext(fullPath))
	if ct == "" {
		ct = "application/octet-stream"
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", ct, encoded), nil
}
