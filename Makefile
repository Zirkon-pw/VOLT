.PHONY: install dev-desktop dev-web dev-mobile build-desktop build-web \
        build-mobile-ios build-mobile-android check clean help

# Default target
help:
	@echo "Volt — multiplatform knowledge base"
	@echo ""
	@echo "Setup:"
	@echo "  make install            Install all dependencies (npm workspaces + frontend + Go)"
	@echo ""
	@echo "Development:"
	@echo "  make dev-desktop        Run Wails dev server (hot-reload desktop app)"
	@echo "  make dev-web            Run Go web server + Vite frontend dev server"
	@echo ""
	@echo "Production builds:"
	@echo "  make build-desktop      Build Wails desktop binary via 'wails build'"
	@echo "  make build-web          Build Go web binary + frontend static assets"
	@echo "  make dev-mobile         Start Expo dev server (scan QR with Expo Go)"
	@echo "  make build-mobile-ios   Build iOS app via EAS"
	@echo "  make build-mobile-android  Build Android APK via EAS"
	@echo ""
	@echo "Quality:"
	@echo "  make check              Run TypeScript + Go static checks"
	@echo "  make clean              Remove all build artifacts and node_modules"

# ─── Setup ────────────────────────────────────────────────────────────────────

install:
	@echo "→ Installing npm workspace packages (packages/ui, packages/web-shell) …"
	npm install
	@echo "→ Installing frontend/ packages (Wails desktop shell) …"
	cd frontend && npm install
	@echo "→ Downloading Go modules …"
	go mod download
	@echo "✅ Web + desktop dependencies installed"
	@echo "   Run 'make init-mobile' to set up the mobile shell separately."

# ─── Development ──────────────────────────────────────────────────────────────

dev-desktop:
	@echo "→ Starting Wails dev server …"
	wails dev

dev-web:
	@echo "→ Starting Go web server on :8080 and Vite dev server on :5174 …"
	cd packages/web-shell && npm run dev &
	go run ./cmd/web

# ─── Production builds ────────────────────────────────────────────────────────

build-desktop:
	@echo "→ Building Wails desktop binary …"
	wails build
	@echo "✅ Desktop binary: build/bin/volt"

build-web:
	@echo "→ Building web frontend …"
	cd packages/web-shell && npm run build
	@echo "→ Building Go web binary …"
	mkdir -p dist
	go build -o dist/volt-web ./cmd/web
	@echo "✅ Web binary: dist/volt-web"
	@echo "✅ Web assets: packages/web-shell/dist/"

dev-mobile:
	@echo "→ Starting Expo dev server …"
	@echo "   Open Expo Go on your device and scan the QR code."
	@echo "   Make sure 'make dev-web' is running so the WebView has a server to load."
	cd packages/mobile-shell && npx expo start

build-mobile-ios:
	@echo "→ Building iOS app via EAS …"
	cd packages/mobile-shell && npx eas build --platform ios

build-mobile-android:
	@echo "→ Building Android APK via EAS …"
	cd packages/mobile-shell && npx eas build --platform android

# ─── Quality ──────────────────────────────────────────────────────────────────

check:
	@echo "→ Type-checking packages/ui …"
	cd packages/ui && npx tsc --noEmit
	@echo "→ Type-checking packages/web-shell …"
	cd packages/web-shell && npx tsc --noEmit
	@echo "→ Type-checking frontend/ (desktop shell) …"
	cd frontend && npx tsc --noEmit
	@echo "→ Running go vet …"
	go vet ./...
	@echo "✅ All checks passed"

init-mobile:
	@echo "→ Installing Expo dependencies for packages/mobile-shell …"
	@echo "   (installed independently — React Native cannot share node_modules with web packages)"
	cd packages/mobile-shell && npm install
	@echo "✅ Mobile shell ready. Run 'make dev-mobile' to start."
	@echo "   Tip: use 'expo start --tunnel' if device and Mac are on different networks."

# ─── Cleanup ──────────────────────────────────────────────────────────────────

clean:
	rm -rf dist/ build/
	rm -rf packages/ui/node_modules packages/ui/dist
	rm -rf packages/web-shell/node_modules packages/web-shell/dist
	rm -rf packages/mobile-shell/node_modules packages/mobile-shell/.expo packages/mobile-shell/.metro-cache
	rm -rf node_modules
	rm -rf frontend/node_modules/.vite
	@echo "✅ Cleaned"
