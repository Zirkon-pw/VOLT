package wailshandler

import (
	"context"

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
	return h.searchFiles.Execute(voltPath, query)
}
