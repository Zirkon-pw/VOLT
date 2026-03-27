package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"volt/internal/bootstrap"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	container := bootstrap.NewContainer()

	err := wails.Run(&options.App{
		Title:  "volt",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 25, G: 25, B: 25, A: 1},
		OnStartup:        container.App.Startup,
		Bind:             container.Bindings(),
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
