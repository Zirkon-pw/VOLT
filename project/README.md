# Кроссплатформенная архитектура Volt

## Что это

Этот каталог описывает реальный путь развития `VOLT-core` от текущего desktop-first приложения к кроссплатформенному ядру.

После текущей итерации в репозитории уже заложены базовые элементы новой схемы:

- `common/` с общими TypeScript-контрактами платформ и совместимости плагинов
- `frontend/src/shared/platform/` с `AdapterProvider`, глобальным adapter registry и адаптерами платформ
- отдельный web entrypoint на Go: `cmd/web/main.go`
- Go HTTP host в `backend/interfaces/http/`
- web shell scaffold в `web/`
- platform-aware plugin manifests и loader filtering

Важно: кодовая база всё ещё находится в переходном состоянии. Внутренний UI и часть runtime-контрактов по-прежнему используют `voltPath` как основной workspace reference. Для web и дальнейшей миграции каноническим направлением считается `workspaceId`, но полная замена ещё впереди.

## Ключевые принципы

1. `frontend/` остаётся source-of-truth для shared UI, editor surfaces и plugin runtime.
2. Платформенные различия инкапсулируются в `PlatformAdapter`, а не размазываются по `shared/api/*`.
3. Desktop остаётся на Wails и Go.
4. Web V1 использует Go backend, а не Node/Express.
5. Mobile V1 проектируется как React Native shell + WebView для shared editor/UI.
6. Плагины должны объявлять платформенную совместимость до загрузки, а не падать в рантайме.
7. Web-клиент не должен видеть реальные server filesystem paths.

## Карта документов

### 1. [Обзор архитектуры](01-overview.md)

Текущее состояние, целевая структура репозитория и правила разделения ответственности между `desktop`, `web`, `mobile`, `frontend`, `backend` и `common`.

### 2. [Адаптерный паттерн](02-adapter-pattern.md)

Общий контракт платформ, `AdapterProvider`, migration shim слой и реализация `wailsAdapter` / `webAdapter`.

### 3. [Мобильное приложение](03-mobile-app.md)

Остаётся как проектная цель mobile V1. Каноническая стратегия: RN shell + WebView.

### 4. [Веб-версия](04-web-version.md)

Go web host, single-tenant session auth, workspace-scoped file API и thin web shell.

### 5. [Система плагинов](05-plugin-system.md)

Новые поля manifest для платформ/capabilities, loader filtering и обновлённый workspace contract.

### 6. [Сборка дистрибутивов](06-distro-build.md)

Описывает будущую сборочную оркестрацию для multi-platform output.

### 7. [План миграции](07-migration-plan.md)

Реалистичный roadmap от уже внедрённого foundation-слоя до полноценного web/mobile rollout.

## Сводка по текущему статусу

### Уже сделано в коде

- вынесены общие типы платформ в `common/types`
- добавлен `AdapterProvider` и глобальный adapter registry
- shared `file/dialog/storage/process` API теперь опираются на активный адаптер
- Wails-зависимости изолированы в `wailsAdapter`
- добавлен `webAdapter` scaffold
- добавлен Go web host с auth, workspace, file и storage API
- plugin manifest расширен платформенной совместимостью
- plugin loader фильтрует несовместимые плагины до `onLoad`

### Ещё не завершено

- перевод всего frontend с `voltPath` на канонический `workspaceId`
- полноценный web UI поверх `web/`
- platform-specific builtin plugin стратегия
- mobile runtime
- contract/integration tests для web и mobile adapters

## Практическое чтение

- Если нужно понять, как теперь устроена абстракция платформ, начинайте с `02-adapter-pattern.md`.
- Если нужен web backend, идите в `04-web-version.md`.
- Если нужна текущая граница plugin runtime, идите в `05-plugin-system.md`.
- Если нужен порядок дальнейшей реализации, открывайте `07-migration-plan.md`.
