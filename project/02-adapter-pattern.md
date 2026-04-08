# Адаптерный паттерн для кроссплатформенности

## Зачем он нужен

Исторически shared frontend Volt напрямую зависел от desktop runtime:

- `wailsjs` модули
- `window.go`
- `window.runtime`

Это делало web/mobile ветки дорогими: platform-specific детали протекали в общий код.

Новая цель:

- platform-specific вызовы живут только в adapter implementation
- shared API и plugin runtime работают с одним и тем же контрактом
- смена платформы означает замену адаптера, а не переписывание UI

## Где это теперь лежит

```text
common/types/
└── platform.ts

frontend/src/shared/platform/
├── adapter.tsx
├── index.ts
└── adapters/
    ├── wails.ts
    └── web.ts
```

## Канонические контракты

### PlatformAdapter

`common/types/platform.ts`

```ts
export interface PlatformAdapter {
  kind: 'desktop' | 'web' | 'mobile';
  capabilities: PlatformCapabilities;
  fs: FileSystemAdapter;
  dialog: DialogAdapter;
  process: ProcessAdapter | null;
  storage: StorageAdapter;
  runtime: RuntimeAdapter;
}
```

### PlatformCapabilities

Capabilities позволяют plugin/runtime коду принимать решение до старта feature:

```ts
export interface PlatformCapabilities {
  localWorkspacePath: boolean;
  process: boolean;
  externalFilePick: boolean;
  embeddedDomEditor: boolean;
  multiWindow: boolean;
}
```

Это важнее, чем просто `platform === 'desktop'`, потому что:

- desktop и mobile могут со временем расходиться по фичам
- web может поддерживать часть UI runtime, но не поддерживать local process
- plugin compatibility можно выражать через capability matrix

## AdapterProvider

`frontend/src/shared/platform/adapter.tsx`

Provider выполняет две задачи:

1. даёт adapter через React context
2. синхронизирует глобальный current adapter для non-React вызовов

Это нужно, потому что Volt использует platform APIs не только внутри компонентов, но и:

- в runtime helpers
- в plugin loader/runtime
- в store-driven flows

## Migration shim слой

Старые точки входа `shared/api/*` пока сохранены, но теперь они являются shim-слоем:

- `shared/api/file/fileApi.ts`
- `shared/api/dialog/dialogApi.ts`
- `shared/api/storage/storageApi.ts`
- `shared/api/process/processApi.ts`
- `shared/api/runtime/browser.ts`

Их задача теперь простая:

- взять активный adapter
- вызвать нужный subsystem
- не знать ничего о Wails/Web/RN напрямую

Это позволяет мигрировать без массового переписывания всех импортов в кодовой базе за один проход.

## Реализации адаптеров

### wailsAdapter

`frontend/src/shared/platform/adapters/wails.ts`

Содержит:

- прямые вызовы `wailsjs` handlers
- десериализацию storage values
- runtime fallback для `BrowserOpenURL`
- desktop capability matrix

Важно: только здесь shared frontend имеет право знать о `wailsjs`.

### webAdapter

`frontend/src/shared/platform/adapters/web.ts`

Содержит:

- HTTP вызовы к `/api/files/*`
- HTTP вызовы к `/api/storage/*`
- browser runtime adapter
- web capability matrix

В web adapter первый аргумент file API временно продолжает называться `rootPath`, потому что shared UI ещё не полностью мигрирован с desktop naming. Семантически для web это уже `workspaceId`.

## Правило для нового кода

Новый shared код не должен:

- импортировать `wailsjs`
- обращаться к `window.go`
- обращаться к `window.runtime`

Вместо этого:

- React-компоненты используют `useFileSystem`, `useDialog`, `useStorage`, `useRuntime`, `useProcess`
- non-React код использует adapter-backed `shared/api/*`

## Добавление новой платформы

Чтобы подключить новую платформу, нужно:

1. реализовать `PlatformAdapter`
2. описать capability matrix
3. подключить свой entrypoint через `AdapterProvider`
4. убедиться, что plugin compatibility использует эти capabilities

### Для mobile

Будущий `reactNativeAdapter` должен:

- дать local file access
- отключить `process`
- объявить `embeddedDomEditor: true` для WebView strategy
- подменить dialog/runtime layer под RN shell

## Граница текущей итерации

Adapter layer уже введён, но ещё не завершено:

- полный переход всех workspace contracts на `workspaceId`
- контрактные тесты для adapters
- mobile adapter
- web-specific replacements для некоторых desktop-first plugin flows

Это нормальная стадия. Цель текущей итерации — не добиться полного parity, а перестроить архитектурную ось так, чтобы дальнейшая миграция шла через adapter implementations, а не через форки shared UI.
