package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"volt/bootstrap"
	"volt/interfaces/wailshandler"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	container := bootstrap.NewContainer()

	err := wails.Run(&options.App{
		Title:     "volt",
		Width:     1280,
		Height:    800,
		MinWidth:  720,
		MinHeight: 560,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: wailshandler.NewVaultAssetServer(),
		},
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},
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
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "Volt",
				Message: "Knowledge management for power users",
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
