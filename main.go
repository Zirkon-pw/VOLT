package main

import (
	"embed"
	"log"

	"volt/cmd/desktop"
)

// assets must be embedded here (module root) because Go embed does not allow
// ".." path segments, so frontend/dist cannot be referenced from cmd/desktop/.
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	if err := desktop.Run(assets); err != nil {
		log.Fatal(err)
	}
}
