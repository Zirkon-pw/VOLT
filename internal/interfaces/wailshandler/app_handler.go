package wailshandler

import (
	"context"
	"log"
)

type AppHandler struct {
	ctx           context.Context
	voltHandler   *VoltHandler
	noteHandler   *NoteHandler
	searchHandler *SearchHandler
	graphHandler  *GraphHandler
	pluginHandler *PluginHandler
}

func NewAppHandler(voltHandler *VoltHandler, noteHandler *NoteHandler, searchHandler *SearchHandler, graphHandler *GraphHandler, pluginHandler *PluginHandler) *AppHandler {
	return &AppHandler{
		voltHandler:   voltHandler,
		noteHandler:   noteHandler,
		searchHandler: searchHandler,
		graphHandler:  graphHandler,
		pluginHandler: pluginHandler,
	}
}

func (h *AppHandler) DomReady(ctx context.Context) {
	log.Println("Volt ready")
}

func (h *AppHandler) Startup(ctx context.Context) {
	h.ctx = ctx
	h.voltHandler.SetContext(ctx)
	h.noteHandler.SetContext(ctx)
	h.searchHandler.SetContext(ctx)
	h.graphHandler.SetContext(ctx)
	h.pluginHandler.SetContext(ctx)
}
