package bootstrap

import (
	"log"

	appgraph "volt/internal/application/graph"
	appnote "volt/internal/application/note"
	appplugin "volt/internal/application/plugin"
	appsearch "volt/internal/application/search"
	appvolt "volt/internal/application/volt"
	"volt/internal/infrastructure/filesystem"
	"volt/internal/infrastructure/persistence/local"
	"volt/internal/interfaces/wailshandler"
)

type Container struct {
	App           *wailshandler.AppHandler
	voltHandler   *wailshandler.VoltHandler
	noteHandler   *wailshandler.NoteHandler
	searchHandler *wailshandler.SearchHandler
	graphHandler  *wailshandler.GraphHandler
	pluginHandler *wailshandler.PluginHandler
}

func NewContainer() *Container {
	// Persistence
	voltStore, err := local.NewVoltStore()
	if err != nil {
		log.Fatalf("failed to initialize volt store: %v", err)
	}

	noteRepo := filesystem.NewNoteRepository()

	// Use cases — volt
	listVolts := appvolt.NewListVoltsUseCase(voltStore)
	createVolt := appvolt.NewCreateVoltUseCase(voltStore)
	deleteVolt := appvolt.NewDeleteVoltUseCase(voltStore)

	// Use cases — note
	readNote := appnote.NewReadNoteUseCase(noteRepo)
	saveNote := appnote.NewSaveNoteUseCase(noteRepo)
	listTree := appnote.NewListTreeUseCase(noteRepo)
	createNote := appnote.NewCreateNoteUseCase(noteRepo)
	createDir := appnote.NewCreateDirectoryUseCase(noteRepo)
	deleteNote := appnote.NewDeleteNoteUseCase(noteRepo)
	renameNote := appnote.NewRenameNoteUseCase(noteRepo)

	// Use cases — search
	searchFiles := appsearch.NewSearchFilesUseCase()

	// Use cases — graph
	buildGraph := appgraph.NewBuildGraphUseCase()

	// Plugin store
	pluginStore, err := filesystem.NewPluginStore()
	if err != nil {
		log.Fatalf("failed to initialize plugin store: %v", err)
	}

	// Use cases — plugin
	listPlugins := appplugin.NewListPluginsUseCase(pluginStore)
	loadPlugin := appplugin.NewLoadPluginUseCase(pluginStore)
	togglePlugin := appplugin.NewTogglePluginUseCase(pluginStore)
	getPluginData := appplugin.NewGetPluginDataUseCase(pluginStore)
	setPluginData := appplugin.NewSetPluginDataUseCase(pluginStore)

	// Handlers
	voltHandler := wailshandler.NewVoltHandler(listVolts, createVolt, deleteVolt)
	noteHandler := wailshandler.NewNoteHandler(readNote, saveNote, listTree, createNote, createDir, deleteNote, renameNote)
	searchHandler := wailshandler.NewSearchHandler(searchFiles)
	graphHandler := wailshandler.NewGraphHandler(buildGraph)
	pluginHandler := wailshandler.NewPluginHandler(listPlugins, loadPlugin, togglePlugin, getPluginData, setPluginData)
	appHandler := wailshandler.NewAppHandler(voltHandler, noteHandler, searchHandler, graphHandler, pluginHandler)

	return &Container{
		App:           appHandler,
		voltHandler:   voltHandler,
		noteHandler:   noteHandler,
		searchHandler: searchHandler,
		graphHandler:  graphHandler,
		pluginHandler: pluginHandler,
	}
}

func (c *Container) Bindings() []interface{} {
	return []interface{}{
		c.App,
		c.voltHandler,
		c.noteHandler,
		c.searchHandler,
		c.graphHandler,
		c.pluginHandler,
	}
}
