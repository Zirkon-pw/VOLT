package bootstrap

import (
	"log"

	appgraph "volt/internal/application/graph"
	appnote "volt/internal/application/note"
	appsearch "volt/internal/application/search"
	appvolt "volt/internal/application/volt"
	"volt/internal/infrastructure/filesystem"
	"volt/internal/infrastructure/persistence/local"
	"volt/internal/interfaces/wailshandler"
)

type Container struct {
	App           *wailshandler.AppHandler
	voltHandler  *wailshandler.VoltHandler
	noteHandler   *wailshandler.NoteHandler
	searchHandler *wailshandler.SearchHandler
	graphHandler  *wailshandler.GraphHandler
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

	// Handlers
	voltHandler := wailshandler.NewVoltHandler(listVolts, createVolt, deleteVolt)
	noteHandler := wailshandler.NewNoteHandler(readNote, saveNote, listTree, createNote, createDir, deleteNote, renameNote)
	searchHandler := wailshandler.NewSearchHandler(searchFiles)
	graphHandler := wailshandler.NewGraphHandler(buildGraph)
	appHandler := wailshandler.NewAppHandler(voltHandler, noteHandler, searchHandler, graphHandler)

	return &Container{
		App:           appHandler,
		voltHandler:  voltHandler,
		noteHandler:   noteHandler,
		searchHandler: searchHandler,
		graphHandler:  graphHandler,
	}
}

func (c *Container) Bindings() []interface{} {
	return []interface{}{
		c.App,
		c.voltHandler,
		c.noteHandler,
		c.searchHandler,
		c.graphHandler,
	}
}
