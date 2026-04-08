# Assets

Place the following files here before first build:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024×1024 | App icon (iOS + Android) |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `splash.png` | 1284×2778 | Splash screen |
| `favicon.png` | 48×48 | Web favicon (Expo web target) |

Quick way to generate placeholder assets (requires ImageMagick):

```bash
# From packages/mobile-shell/assets/
magick -size 1024x1024 xc:#6b6bd6 -fill white -font Arial -pointsize 400 \
  -gravity Center -draw "text 0,0 'V'" icon.png
cp icon.png adaptive-icon.png
magick -size 1284x2778 xc:#1a1a1a splash.png
magick -size 48x48 xc:#6b6bd6 favicon.png
```

Or use any 1024×1024 PNG as a placeholder — Expo only needs it for production builds.
