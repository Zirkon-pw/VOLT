package wailshandler

import (
	"context"
)

type AppHandler struct {
	ctx           context.Context
	voltHandler  *VoltHandler
	noteHandler   *NoteHandler
	searchHandler *SearchHandler
	graphHandler  *GraphHandler
}

func NewAppHandler(voltHandler *VoltHandler, noteHandler *NoteHandler, searchHandler *SearchHandler, graphHandler *GraphHandler) *AppHandler {
	return &AppHandler{
		voltHandler:  voltHandler,
		noteHandler:   noteHandler,
		searchHandler: searchHandler,
		graphHandler:  graphHandler,
	}
}

func (h *AppHandler) Startup(ctx context.Context) {
	h.ctx = ctx
	h.voltHandler.SetContext(ctx)
	h.noteHandler.SetContext(ctx)
	h.searchHandler.SetContext(ctx)
	h.graphHandler.SetContext(ctx)
}
