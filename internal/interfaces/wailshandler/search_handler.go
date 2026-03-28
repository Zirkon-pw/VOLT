package wailshandler

import (
	"context"
	"fmt"

	domain "volt/core/search"
	appsearch "volt/internal/application/search"
)

type SearchHandler struct {
	ctx         context.Context
	searchFiles *appsearch.SearchFilesUseCase
}

func NewSearchHandler(searchFiles *appsearch.SearchFilesUseCase) *SearchHandler {
	return &SearchHandler{
		searchFiles: searchFiles,
	}
}

func (h *SearchHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *SearchHandler) SearchFiles(voltPath, query string) ([]domain.SearchResult, error) {
	result, err := h.searchFiles.Execute(voltPath, query)
	if err != nil {
		return nil, fmt.Errorf("failed to search files for %q: %w", query, err)
	}
	return result, nil
}
