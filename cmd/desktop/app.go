package desktop

import (
	"io/fs"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"volt/backend/bootstrap"
	wailshandler "volt/backend/interfaces"
)

// Run starts the Wails desktop application.
// assets is the embedded frontend/dist filesystem passed in from main.go,
// which must live at the module root to satisfy Go embed path restrictions.
func Run(assets fs.FS) error {
	container := bootstrap.NewContainer()

	return wails.Run(&options.App{
		Title:     "volt",
		Width:     1280,
		Height:    800,
		MinWidth:  720,
		MinHeight: 560,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: wailshandler.NewVaultAssetServer(),
		},
		BackgroundColour: &options.RGBA{R: 236, G: 223, B: 210, A: 255},
		StartHidden:      false,
		Frameless:        false,
		OnStartup:        container.Lifecycle.Startup,
		OnDomReady:       container.Lifecycle.DomReady,
		Bind:             container.Bindings(),
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  true,
				HideTitleBar:               false,
				FullSizeContent:            true,
				UseToolbar:                 false,
			},
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   "Volt",
				Message: "Knowledge management for power users",
			},
		},
	})
}
