package wailshandler

import (
	"context"
	"fmt"

	domain "volt/core/graph"
	appgraph "volt/internal/application/graph"
)

type GraphHandler struct {
	ctx        context.Context
	buildGraph *appgraph.BuildGraphUseCase
}

func NewGraphHandler(buildGraph *appgraph.BuildGraphUseCase) *GraphHandler {
	return &GraphHandler{
		buildGraph: buildGraph,
	}
}

func (h *GraphHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

func (h *GraphHandler) GetGraph(voltPath string) (*domain.Graph, error) {
	result, err := h.buildGraph.Execute(voltPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build graph for vault: %w", err)
	}
	return result, nil
}
