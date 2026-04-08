# Обзор кроссплатформенной архитектуры Volt

## 1. Текущее состояние

На сегодня `VOLT-core` остаётся рабочим desktop приложением на:

- `Go`
- `Wails`
- `React`
- `TypeScript`
- `Zustand`
- `Tiptap`

Текущий production flow по-прежнему desktop-first:

- root `main.go` поднимает Wails app
- `backend/` содержит file/process/dialog/storage слои
- `frontend/` содержит shared UI, editor, workspace shell и plugin runtime
- builtin plugins живут в `frontend/src/plugins`

## 2. Что изменилось в этой итерации

В репозитории появился foundation-слой для кроссплатформенности:

```text
volt-core/
├── backend/
│   ├── bootstrap/
│   │   ├── container.go        # desktop Wails composition root
│   │   └── web.go              # web HTTP composition root
│   └── interfaces/
│       ├── ...
│       └── http/               # Go web handlers
├── cmd/
│   └── web/
│       └── main.go             # web binary
├── common/
│   └── types/                  # platform/plugin contracts
├── frontend/
│   └── src/
│       └── shared/
│           └── platform/       # AdapterProvider + adapters
├── web/
│   └── src/
│       └── main.tsx            # web shell scaffold
└── main.go                     # desktop Wails entrypoint
```

## 3. Целевая модель

### Desktop

- runtime: `Wails`
- backend: `Go`
- UI: shared `frontend/`
- adapter: `wailsAdapter`

### Web V1

- runtime: browser
- backend: `Go net/http`
- auth: single-tenant cookie session
- UI: thin shell в `web/`, монтирующий shared app
- adapter: `webAdapter`

### Mobile V1

- runtime: `React Native`
- shell: нативная навигация и lifecycle
- editor/UI: shared surfaces через `WebView`
- adapter: будущий `reactNativeAdapter`

## 4. Главные архитектурные решения

### Shared frontend остаётся общим

Мы не раскалываем `frontend/` на отдельный framework-agnostic engine в этой итерации. Вместо этого:

- shared app остаётся в `frontend/`
- платформы подключают его через собственные entrypoints
- платформенные вызовы идут через adapter layer

### Адаптерный слой становится единственной точкой доступа к платформе

Раньше `shared/api/*` напрямую работали с Wails bridge. Теперь:

- `shared/api/file|dialog|storage|process` делегируют в текущий `PlatformAdapter`
- прямые `wailsjs` зависимости изолированы в `frontend/src/shared/platform/adapters/wails.ts`
- web/mobile могут подставлять свой адаптер без переписывания вызывающего кода

### Web API workspace-scoped

Для web нельзя считать `rootPath` безопасным общим контрактом. Поэтому целевое направление такое:

- клиент работает с `workspaceId`
- backend сам резолвит реальную папку workspace
- реальные server paths не возвращаются в API

Важно: внутри текущего shared UI всё ещё остаётся много `voltPath`. Это переходное наследие desktop-first модели, а не долгосрочный контракт.

## 5. Общие пакеты и контракты

`common/types/` теперь содержит:

- `PlatformKind`
- `PlatformCapabilities`
- `PlatformAdapter`
- `WorkspaceDescriptor`
- `FileEntry`
- storage/process/dialog contracts
- plugin compatibility contracts

Это базовый слой, которым должны пользоваться:

- `frontend`
- `web`
- будущий `mobile`
- plugin manifest/runtime логика

## 6. Почему web backend на Go

Web backend сознательно стандартизирован на `Go`, потому что:

- уже есть рабочие `application/file` и `application/storage`
- уже есть path traversal protection и filesystem semantics
- не нужно дублировать domain/application логику в Node
- desktop и web могут разделять большую часть backend-логики

Node/Express подход из старых документов больше не считается целевой архитектурой.

## 7. Плагины и платформы

Plugin runtime остаётся частью shared frontend, но manifest теперь умеет описывать:

- `platforms`
- `requiredCapabilities`

Loader обязан:

- проверить совместимость до загрузки
- пропустить несовместимый plugin
- не давать plugin с `process` permission стартовать на web/mobile

## 8. Что дальше

Следующие реальные шаги:

1. расширять adapter-backed migration внутри frontend
2. завершать web shell и web auth UI
3. переносить workspace model на `workspaceId`
4. адаптировать builtin plugins под web/mobile compatibility
5. строить mobile shell поверх уже введённых контрактов
