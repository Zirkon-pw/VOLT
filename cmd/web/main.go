package main

import (
	"log"
	"net/http"
	"os"

	"volt/backend/bootstrap"
)

func main() {
	addr := os.Getenv("VOLT_WEB_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	password := os.Getenv("VOLT_WEB_PASSWORD")
	container := bootstrap.NewWebContainer(password)

	log.Printf("Volt web host listening on %s", addr)
	if err := http.ListenAndServe(addr, container.Server); err != nil {
		log.Fatal(err)
	}
}
