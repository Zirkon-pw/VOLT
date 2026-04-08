# Система плагинов в кроссплатформенном Volt

## Текущее положение

Volt сохраняет единый plugin runtime в shared frontend и API v5 как канонический контракт.

Но после введения web/mobile направления этого уже недостаточно: plugin должен быть совместим не просто с “Volt вообще”, а с конкретным runtime.

## Что добавлено

### Manifest теперь может описывать платформу

`frontend/src/kernel/plugin-system/api/pluginTypes.ts`

```ts
export interface PluginManifest {
  apiVersion: number;
  id: string;
  name: string;
  version: string;
  description: string;
  main: string;
  permissions: string[];
  platforms?: ('desktop' | 'web' | 'mobile')[];
  requiredCapabilities?: string[];
  settings?: PluginManifestSettings;
}
```

### Compatibility resolution

`frontend/src/kernel/plugin-system/api/pluginCompatibility.ts`

Loader теперь вычисляет `PluginCompatibility` до выполнения `onLoad`.

Проверки включают:

- поддерживается ли текущая `platform`
- хватает ли `requiredCapabilities`
- доступен ли `process` runtime для плагинов, которые запрашивают permission `process`

## Правило загрузки

Plugin loader теперь обязан:

1. прочитать manifest
2. вычислить compatibility
3. пропустить plugin, если он несовместим
4. залогировать причину skip
5. не выполнять `onLoad`

Это важнее, чем делать best-effort runtime и ловить падение уже после старта plugin lifecycle.

## Что изменилось для UI

В settings/plugins:

- несовместимые плагины показываются как недоступные
- toggle для них отключён
- при попытке включения возвращается понятная ошибка

Таким образом пользователь видит, что проблема в платформе, а не в “сломанном плагине”.

## Workspace contract для plugin API

Исторически plugin runtime жил вокруг `rootPath`.

Это допустимо на desktop, но unsafe как общий контракт для web. Поэтому добавлены новые методы:

```ts
workspace.getId()
workspace.getDisplayName()
workspace.getActivePath()
workspace.getRootPath() // compatibility shim
```

### Как это интерпретировать

- `getId()` и `getDisplayName()` — новые канонические методы
- `getRootPath()` пока остаётся для desktop compatibility
- для web долгосрочная цель — убрать зависимость plugin code от абсолютного root path

Важно: в текущем коде `getRootPath()` всё ещё возвращает `voltPath`, потому что вся UI-модель пока окончательно не переехала на `workspaceId`.

## Permissions vs capabilities

Permissions и capabilities решают разные задачи:

### Permissions

Определяют, что plugin хочет делать:

- `read`
- `write`
- `editor`
- `process`
- `external`
- `inter-plugin`

### Capabilities

Определяют, что host runtime реально умеет:

- `localWorkspacePath`
- `process`
- `externalFilePick`
- `embeddedDomEditor`
- `multiWindow`

Совместимость получается только на пересечении этих двух наборов.

## Platform rules в V1

### Desktop

- может использовать `process`
- имеет local workspace paths
- остаётся baseline runtime для всех legacy-compatible plugin flows

### Web

- не должен поддерживать `process`
- не должен раскрывать реальные filesystem paths
- plugin compatibility должна это учитывать заранее

### Mobile

- process выключен
- ожидается ограниченный набор capabilities
- WebView editor считается частью runtime strategy, а не прямым DOM parity

## Что дальше

Следующие шаги для plugin system:

1. добавить contract tests для compatibility resolution
2. перевести plugin-owned file/assets flows на `workspaceId`-совместимую модель
3. разделить builtin plugins по реальной поддержке desktop/web/mobile
4. добавить platform-aware import/validation для внешних plugin bundles
