package wailshandler

import (
	"context"

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
	return h.buildGraph.Execute(voltPath)
}
