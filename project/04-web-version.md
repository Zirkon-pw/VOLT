# Веб-версия Volt на Go

## Главное изменение

Старый проектный вариант с `Node.js + Express` больше не актуален.

Web V1 теперь проектируется и частично реализован как:

- backend: `Go`
- transport: `net/http`
- router: `http.ServeMux`
- shell: thin frontend package в `web/`
- shared UI: reused из `frontend/`

Это позволяет использовать существующие backend-слои Volt вместо их дублирования в другом стеке.

## Что уже добавлено в репозиторий

```text
cmd/web/main.go
backend/bootstrap/web.go
backend/interfaces/http/server.go
web/
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.ts
└── src/main.tsx
```

## Архитектура web backend

### Entry point

`cmd/web/main.go`

Отдельный бинарь запускает Volt как web host и не затрагивает desktop `main.go`.

### Composition root

`backend/bootstrap/web.go`

Web bootstrap переиспользует существующие слои:

- `application/file`
- `application/storage`
- `infrastructure/filesystem`
- `infrastructure/storage`

Desktop-специфичные runtime/dialog/process зависимости сюда не тянутся.

### HTTP host

`backend/interfaces/http/server.go`

Server предоставляет:

- cookie-based session auth
- workspace registry
- file CRUD API
- storage API
- asset endpoint
- fallback static/placeholder frontend serving

## Модель аутентификации

Web V1 намеренно single-tenant:

- один локальный admin user
- пароль берётся из `VOLT_WEB_PASSWORD`
- если переменная не задана, используется локальный default для bootstrap/development
- успешный login выдаёт `HttpOnly` cookie session

Это не SaaS-модель и не multi-user tenancy. Задача V1 — безопасно запустить self-hosted экземпляр без удвоения product complexity.

## Workspace model

### Каноника для web

Клиент не должен знать реальный путь до workspace на сервере.

Поэтому web API строится вокруг:

- `workspaceId`
- относительного `path` внутри workspace

Backend сам делает:

- lookup `workspaceId -> real root path`
- safe path resolution внутри root
- отказ при попытке выйти наружу

### Где хранится registry

Пока registry использует namespace storage:

- namespace: `vaults`

Хранится запись вида:

- `id`
- `name`
- `path`
- `createdAt`

В API клиенту path не возвращается.

## HTTP API

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

### Workspaces

- `GET /api/workspaces`
- `POST /api/workspaces`
- `DELETE /api/workspaces?id=...`

### Files

- `GET /api/files/read`
- `GET /api/files/tree`
- `POST /api/files/create`
- `POST /api/files/write`
- `POST /api/files/directory`
- `POST /api/files/delete`
- `POST /api/files/rename`
- `GET /api/files/asset`

### Storage

- `GET /api/storage/get`
- `GET /api/storage/list`
- `POST /api/storage/set`
- `POST /api/storage/delete`
- `GET /api/storage/config-dir`

`config-dir` на web не должен раскрывать реальный filesystem path. Поэтому это логический endpoint, а не способ вытащить server path в клиент.

## Безопасность

### Path traversal

Для file endpoints backend обязан запрещать доступ вне workspace root.

### Server path leakage

Web API не должен:

- возвращать абсолютные пути к vault
- строить client contracts вокруг `rootPath`
- отдавать реальный config dir

### Process execution

Web V1 не включает process runtime. Даже если plugin исторически умеет `process.start`, такой plugin должен считаться несовместимым для web.

## Web frontend shell

`web/src/main.tsx` сейчас является thin shell:

- монтирует shared `AppContent`
- оборачивает его в `AdapterProvider`
- подставляет `webAdapter`

Это сознательная архитектура:

- логика UI не должна форкаться на отдельный “web frontend”
- web слой должен быть entrypoint и runtime bridge, а не новой реализацией продукта с нуля

## Что ещё осталось

### Нужно довести

- полноценный login UI
- web-aware workspace flows вместо desktop path assumptions
- server-safe plugin management UI
- web asset/search/image flows поверх `workspaceId`
- integration tests для auth/file/storage маршрутов

### Dialog gaps и решения

На web платформе нативные диалоги недоступны. Решения:

- **`pickImage()`** — реализован через скрытый `<input type="file" accept="image/*">`, возвращает data URL
- **`pickFiles()`** — аналогично, с формированием `accept` из `DialogFileFilter[]`
- **`selectDirectory()`** — бросает ошибку с пояснением. На web workspace'ы создаются через API, а не через directory picker. UI слой проверяет `capabilities.localWorkspacePath` и показывает web-специфичный workspace picker
- **`configDir()`** — возвращает sentinel `'web:storage'`. Код, зависящий от filesystem config dir (например `catalogApi`), проверяет этот sentinel и не пытается читать plugins из файловой системы
- **`PlatformNetworkError`** — все `fetch` вызовы в web adapter обёрнуты в обработку сетевых ошибок с кастомным error классом

### Не делаем в V1

- multi-user tenancy
- OAuth
- billing
- server-side plugin process execution
- Node/Express backend
