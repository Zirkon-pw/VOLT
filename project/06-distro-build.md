# Сборка дистрибутивов

## Обзор

Отдельный репозиторий `volt-distro-builder` собирает установочники из ядра (`volt-core`) и выбранных плагинов.

## Архитектура

### Репозитории

```
volt-core/                    # Ядро (desktop, mobile, web)
volt-plugin-sync/             # Плагин синхронизации
volt-plugin-collab/           # Плагин коллаборации
volt-plugin-calendar/         # Плагин календаря
volt-plugin-*/                # Другие плагины

volt-distro-builder/          # Сборка (этот репо)
├── .github/workflows/
├── configs/
└── scripts/
```

### Процесс сборки

```
1. Клонировать volt-core
2. Клонировать выбранные плагины
3. Установить зависимости
4. Собрать плагины
5. Собрать ядро для целевой платформы
6. Упаковать установочник
```

## Конфигурации бандлов

### Desktop Bundle

```json
// configs/desktop-bundle.json

{
  "name": "Volt Desktop",
  "platform": "desktop",
  "core": {
    "repo": "volt-core",
    "branch": "main"
  },
  "plugins": [
    {
      "repo": "volt-plugin-sync",
      "branch": "main",
      "required": false,
      "enabled_by_default": false
    },
    {
      "repo": "volt-plugin-collab",
      "branch": "main",
      "required": false,
      "enabled_by_default": false
    },
    {
      "repo": "volt-plugin-calendar",
      "branch": "main",
      "required": false,
      "enabled_by_default": false
    }
  ],
  "output": {
    "format": "tar.gz",
    "path": "dist/volt-desktop"
  }
}
```

### Mobile Bundle

```json
// configs/mobile-bundle.json

{
  "name": "Volt Mobile",
  "platform": "mobile",
  "core": {
    "repo": "volt-core",
    "branch": "main"
  },
  "plugins": [
    {
      "repo": "volt-plugin-sync",
      "branch": "main",
      "required": false,
      "platforms": ["mobile"]
    }
  ],
  "output": {
    "format": "apk|ipa",
    "path": "dist/volt-mobile"
  }
}
```

### Web Bundle

```json
// configs/web-bundle.json

{
  "name": "Volt Web (Self-hosted)",
  "platform": "web",
  "core": {
    "repo": "volt-core",
    "branch": "main"
  },
  "plugins": [
    {
      "repo": "volt-plugin-sync",
      "branch": "main",
      "required": false
    },
    {
      "repo": "volt-plugin-collab",
      "branch": "main",
      "required": false
    }
  ],
  "output": {
    "format": "docker",
    "path": "dist/volt-web"
  }
}
```

## GitHub Actions

### Desktop Build

```yaml
# .github/workflows/build-desktop.yml

name: Build Desktop

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to build'
        required: true
        type: string

jobs:
  build:
    name: Build ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - name: Checkout builder
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.26'

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Build Desktop
        run: |
          chmod +x scripts/build.sh
          ./scripts/build.sh configs/desktop-bundle.json desktop

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: volt-desktop-${{ matrix.os }}
          path: dist/volt-desktop-*

  release:
    name: Create Release
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')

    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: volt-desktop-*/*
          draft: true
          generate_release_notes: true
```

### Mobile Build

```yaml
# .github/workflows/build-mobile.yml

name: Build Mobile

on:
  push:
    tags:
      - 'v*-mobile'
  workflow_dispatch:

jobs:
  build-ios:
    name: Build iOS
    runs-on: macos-latest

    steps:
      - name: Checkout builder
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build Mobile
        run: |
          chmod +x scripts/build.sh
          ./scripts/build.sh configs/mobile-bundle.json mobile-ios

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: volt-mobile-ios
          path: dist/volt-mobile-ios.ipa

  build-android:
    name: Build Android
    runs-on: ubuntu-latest

    steps:
      - name: Checkout builder
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'

      - name: Build Mobile
        run: |
          chmod +x scripts/build.sh
          ./scripts/build.sh configs/mobile-bundle.json mobile-android

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: volt-mobile-android
          path: dist/volt-mobile-android.apk
```

### Web Build

```yaml
# .github/workflows/build-web.yml

name: Build Web

on:
  push:
    tags:
      - 'v*-web'
  workflow_dispatch:

jobs:
  build:
    name: Build Web Docker
    runs-on: ubuntu-latest

    steps:
      - name: Checkout builder
        uses: actions/checkout@v4

      - name: Setup Docker
        uses: docker/setup-buildx-action@v3

      - name: Build Web
        run: |
          chmod +x scripts/build.sh
          ./scripts/build.sh configs/web-bundle.json web

      - name: Build Docker image
        run: |
          cd dist/volt-web
          docker build -t volt-web:${{ github.ref_name }} .
          docker save volt-web:${{ github.ref_name }} > ../volt-web-docker.tar

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: volt-web-docker
          path: dist/volt-web-docker.tar
```

## Скрипт сборки

```bash
#!/bin/bash
# scripts/build.sh

set -e

CONFIG=$1
PLATFORM=$2
VERSION=${3:-$(git describe --tags --always --dirty)}

if [ -z "$CONFIG" ] || [ -z "$PLATFORM" ]; then
  echo "Usage: $0 <config> <platform> [version]"
  exit 1
fi

echo "=== Building Volt for $PLATFORM ==="
echo "Config: $CONFIG"
echo "Version: $VERSION"
echo ""

# Создать временную директорию
BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

cd $BUILD_DIR

# Загрузить конфигурацию
echo "📦 Loading configuration..."
CORE_REPO=$(jq -r '.core.repo' $GITHUB_WORKSPACE/$CONFIG)
CORE_BRANCH=$(jq -r '.core.branch' $GITHUB_WORKSPACE/$CONFIG)
OUTPUT_FORMAT=$(jq -r '.output.format' $GITHUB_WORKSPACE/$CONFIG)
OUTPUT_PATH=$(jq -r '.output.path' $GITHUB_WORKSPACE/$CONFIG)

# Клонировать ядро
echo "🔧 Cloning core..."
git clone https://github.com/your-org/$CORE_REPO core -b $CORE_BRANCH --depth 1

# Клонировать плагины
echo "🔌 Cloning plugins..."
mkdir plugins
PLUGIN_COUNT=$(jq -r '.plugins | length' $GITHUB_WORKSPACE/$CONFIG)

for i in $(seq 0 $((PLUGIN_COUNT - 1))); do
  PLUGIN_REPO=$(jq -r ".plugins[$i].repo" $GITHUB_WORKSPACE/$CONFIG)
  PLUGIN_BRANCH=$(jq -r ".plugins[$i].branch" $GITHUB_WORKSPACE/$CONFIG)
  
  echo "  - Cloning $PLUGIN_REPO ($PLUGIN_BRANCH)..."
  git clone https://github.com/your-org/$PLUGIN_REPO plugins/$PLUGIN_REPO -b $PLUGIN_BRANCH --depth 1
done

# Установить зависимости
echo ""
echo "📥 Installing dependencies..."

cd core/frontend
npm install
cd ../backend
go mod download
cd ../..

for plugin in plugins/*; do
  if [ -d "$plugin" ]; then
    echo "  - Installing $plugin..."
    cd $plugin
    npm install
    cd ../..
  fi
done

# Собрать плагины
echo ""
echo "🏗️  Building plugins..."
for plugin in plugins/*; do
  if [ -d "$plugin" ]; then
    echo "  - Building $plugin..."
    cd $plugin
    npm run build
    cd ../..
  fi
done

# Собрать ядро
echo ""
echo "🚀 Building core for $PLATFORM..."
cd core

case $PLATFORM in
  desktop)
    echo "  Building with Wails..."
    wails build -ldflags "-X main.version=$VERSION"
    ;;
  
  mobile-ios)
    echo "  Building for iOS..."
    cd mobile
    npm install
    cd ios
    pod install
    cd ..
    npm run build:ios
    ;;
  
  mobile-android)
    echo "  Building for Android..."
    cd mobile
    npm install
    npm run build:android
    ;;
  
  web)
    echo "  Building web version..."
    # Build Go backend binary
    cd core
    go build -o ../web-binary/volt-web ./cmd/web
    cd ..
    # Build frontend
    cd web
    npm install
    npm run build
    cd ..
    ;;
  
  *)
    echo "❌ Unknown platform: $PLATFORM"
    exit 1
    ;;
esac

cd ..

# Упаковать
echo ""
echo "📦 Packaging..."
mkdir -p $GITHUB_WORKSPACE/$OUTPUT_PATH

case $PLATFORM in
  desktop)
    cp -r core/build/bin/* $GITHUB_WORKSPACE/$OUTPUT_PATH/
    cp -r plugins $GITHUB_WORKSPACE/$OUTPUT_PATH/
    
    cd $GITHUB_WORKSPACE
    tar -czf $OUTPUT_PATH-$PLATFORM.tar.gz $OUTPUT_PATH/
    echo "✅ Created: $OUTPUT_PATH-$PLATFORM.tar.gz"
    ;;
  
  mobile-ios)
    cp mobile/build/ios/Volt.ipa $GITHUB_WORKSPACE/$OUTPUT_PATH/
    echo "✅ Created: $OUTPUT_PATH/Volt.ipa"
    ;;
  
  mobile-android)
    cp mobile/android/app/build/outputs/apk/release/app-release.apk $GITHUB_WORKSPACE/$OUTPUT_PATH/
    echo "✅ Created: $OUTPUT_PATH/Volt.apk"
    ;;
  
  web)
    cp web-binary/volt-web $GITHUB_WORKSPACE/$OUTPUT_PATH/
    cp -r core/web/dist/* $GITHUB_WORKSPACE/$OUTPUT_PATH/dist/
    cp -r plugins $GITHUB_WORKSPACE/$OUTPUT_PATH/
    cp core/web/Dockerfile $GITHUB_WORKSPACE/$OUTPUT_PATH/
    cp core/web/docker-compose.yml $GITHUB_WORKSPACE/$OUTPUT_PATH/
    
    cd $GITHUB_WORKSPACE
    tar -czf $OUTPUT_PATH-$PLATFORM.tar.gz $OUTPUT_PATH/
    echo "✅ Created: $OUTPUT_PATH-$PLATFORM.tar.gz"
    ;;
esac

echo ""
echo "=== Build complete! ==="
```

## Структура установочника

### Desktop

```
volt-desktop/
├── volt                   # Binary (macOS/Linux) или .exe (Windows)
├── plugins/               # Собранные плагины
│   ├── volt-plugin-sync/
│   │   ├── manifest.json
│   │   └── dist/
│   │       └── index.js
│   ├── volt-plugin-collab/
│   │   └── ...
│   └── volt-plugin-calendar/
│       └── ...
└── README.md              # Инструкция по установке
```

### Mobile

```
volt-mobile/
├── Volt.ipa               # iOS
├── Volt.apk               # Android
└── README.md
```

### Web

```
volt-web/
├── dist/                  # Static files
│   ├── index.html
│   ├── static/
│   └── ...
├── plugins/               # Собранные плагины
│   └── ...
├── volt-web               # Go binary (backend)
├── .env.example           # Env config (VOLT_WEB_PASSWORD и др.)
├── Dockerfile
├── docker-compose.yml
└── README.md              # Инструкция по деплою
```

## Локальная сборка

### Desktop

```bash
# Собрать desktop версию локально
./scripts/build.sh configs/desktop-bundle.json desktop

# Или через Makefile в ядре
cd volt-core
make build-desktop
```

### Mobile

```bash
# Собрать mobile версию локально
./scripts/build.sh configs/mobile-bundle.json mobile-ios
# или
./scripts/build.sh configs/mobile-bundle.json mobile-android
```

### Web

```bash
# Собрать web версию локально
./scripts/build.sh configs/web-bundle.json web

# Запустить локально
cd dist/volt-web
docker-compose up -d
```

## CI/CD Pipeline

### Полный pipeline

```
┌─────────────────────────────────────────┐
│           Push tag v1.0.0               │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│  Build   │  │  Build   │
│ Desktop  │  │  Mobile  │
└──────────┘  └──────────┘
      │             │
      ▼             ▼
┌──────────┐  ┌──────────┐
│ Upload   │  │ Upload   │
│ Artifact │  │ Artifact │
└──────────┘  └──────────┘
      │             │
      └──────┬──────┘
             ▼
      ┌──────────┐
      │ Release  │
      │ Draft    │
      └──────────┘
```

### Ручной запуск

```bash
# Через GitHub CLI
gh workflow run build-desktop.yml -f version=v1.0.0
gh workflow run build-mobile.yml
gh workflow run build-web.yml
```

## Тестирование сборки

### Интеграционные тесты

```bash
# scripts/test-build.sh

#!/bin/bash
set -e

echo "Testing build..."

# Собрать
./scripts/build.sh configs/desktop-bundle.json desktop

# Проверить что файлы существуют
test -f dist/volt-desktop/volt
test -d dist/volt-desktop/plugins

# Проверить плагины
for plugin in dist/volt-desktop/plugins/*; do
  test -f $plugin/manifest.json
  test -f $plugin/dist/index.js
done

echo "✅ All tests passed!"
```

## План реализации

### Этап 1: Инфраструктура
- [ ] Создать репозиторий `volt-distro-builder`
- [ ] Создать конфигурации бандлов
- [ ] Создать базовый скрипт сборки

### Этап 2: GitHub Actions
- [ ] Создать workflow для desktop
- [ ] Создать workflow для mobile
- [ ] Создать workflow для web

### Этап 3: Тестирование
- [ ] Протестировать desktop сборку
- [ ] Протестировать mobile сборку
- [ ] Протестировать web сборку

### Этап 4: Автоматизация
- [ ] Настроить автоматические релизы
- [ ] Настроить уведомления
- [ ] Создать документацию

## Преимущества подхода

1. **Отделение ядра от плагинов** - ядро минимальное, плагины независимы
2. **Гибкость** - можно собирать разные бандлы
3. **Независимые обновления** - плагины обновляются отдельно
4. **Прозрачность** - видно что входит в сборку

## Недостатки

1. **Сложность** - нужно управлять несколькими репо
2. **Время сборки** - клонирование занимает время
3. **Зависимости** - нужно отслеживать совместимость плагинов
