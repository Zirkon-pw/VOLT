# План миграции к кроссплатформенному ядру

## Статус на сегодня

### Уже внедрено

#### Phase A: Platform foundation

- `common/` с общими platform/plugin контрактами
- `AdapterProvider`
- `wailsAdapter`
- `webAdapter` scaffold
- adapter-backed `shared/api/*`

#### Phase B: Web backend foundation

- отдельный web binary `cmd/web/main.go`
- Go HTTP host в `backend/interfaces/http/`
- single-tenant cookie session auth
- workspace/file/storage web endpoints

#### Phase C: Plugin compatibility foundation

- `platforms` и `requiredCapabilities` в manifest model
- loader filtering до `onLoad`
- settings UI для несовместимых plugin entries
- `workspace.getId()` и `workspace.getDisplayName()`

## Что это означает

Мы больше не на нулевой фазе. Переход от “десктоп с проектными заметками о будущем” к реальному кроссплатформенному foundation уже начался.

Оставшаяся миграция — это не изобретение архитектуры с нуля, а доведение уже введённых осей до production completeness.

## Оставшийся roadmap

### Phase 1: Завершить desktop extraction ✅

Цель:

- окончательно убрать platform-specific доступ из shared frontend вне adapter implementations

Задачи:

- ✅ убраны прямые обращения к `wailsjs` из shared frontend
- ✅ `pluginProcessManager.ts` мигрирован с прямого `EventsOn` импорта на `adapter.process.onProcessEvent()`
- ✅ `ProcessAdapter` расширен методом `onProcessEvent(callback)` с типизированным `ProcessEventPayload`
- добавить contract tests для `wailsAdapter`

Критерий готовности:

- ✅ shared frontend не знает о `wailsjs`, кроме `wailsAdapter`

### Phase 2: Workspace model migration ✅

Цель:

- сделать `workspaceId` каноническим cross-platform идентификатором

Задачи:

- ✅ `WorkspaceRef { id, displayName, locator }` заменил `WorkspaceTab { voltId, voltName, voltPath }`
- ✅ `rootPath` переименован в `workspaceLocator` во всём `FileSystemAdapter` контракте
- ✅ `voltPath` переименован в `locator` во всех ~30 компонентах frontend
- ✅ store/router/runtime контракты обновлены
- ✅ web adapter использует `workspaceLocator` вместо `workspaceId`/`rootPath`

Критерий готовности:

- ✅ web flows не зависят от абсолютного root path

### Phase 3: Web shell completion

Цель:

- довести `web/` до реально запускаемого browser client

Задачи:

- login/logout/session UI
- web-aware workspace list/open flows
- adapter-backed storage/file integration поверх Go backend
- server-safe plugin management UX

Критерий готовности:

- можно залогиниться, увидеть workspaces, открыть дерево файлов и прочитать markdown

### Phase 4: Web production hardening

Цель:

- сделать web host безопасным и эксплуатационно понятным

Задачи:

- integration tests для auth/file/storage
- asset/image delivery
- config via env
- packaging/deploy docs
- observability и error reporting для HTTP host

Критерий готовности:

- self-hosted web instance можно разворачивать без ручного дебага backend routing

### Phase 5: Mobile shell

Цель:

- запустить mobile V1 поверх тех же контрактов

Задачи:

- создать RN shell
- реализовать `reactNativeAdapter`
- связать local file access
- встроить WebView editor strategy

Критерий готовности:

- можно открыть workspace, отредактировать файл и сохранить результат

### Phase 6: Plugin parity by platform

Цель:

- сделать platform support явным и проверяемым

Задачи:

- проставить manifest compatibility для builtin plugins
- определить web/mobile-safe subset plugin APIs
- добавить compatibility regression checks

Критерий готовности:

- набор plugin возможностей предсказуем и не зависит от случайных runtime падений

## Практический приоритет

Если нужна следующая реальная инженерная итерация, порядок такой:

1. contract tests для adapters
2. workspaceId migration в shared runtime
3. web login + workspace open UI
4. web asset/image flow
5. mobile shell bootstrap

## Риски

### Риск 1: частичная миграция workspace contracts ✅ Resolved

~~Сейчас часть системы уже думает про `workspaceId`, а часть всё ещё живёт в `voltPath`.~~

Миграция завершена: `WorkspaceRef` + `workspaceLocator` используются повсеместно. `voltPath` и `WorkspaceTab` удалены.

### Риск 2: desktop assumptions внутри builtin plugins

Даже при adapter слое некоторые plugins могут неявно предполагать local path semantics.

Митигация:

- описать platform support в manifest
- проверять compatibility до load

### Риск 3: web shell может выглядеть готовым раньше времени

Scaffold не равен product-complete реализации.

Митигация:

- считать web host foundation и web UI completion разными фазами

## Минимальный definition of done для кроссплатформенного foundation

Foundation можно считать успешно заложенным, если:

- platform adapter является единственной точкой platform access
- web backend запущен на Go и reuse-ит существующие backend слои
- plugin compatibility известна до загрузки
- путь к production web/mobile больше не требует архитектурного разворота
