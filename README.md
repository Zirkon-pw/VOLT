# volt

volt это десктопное приложение для работы с локальными markdown-хранилищами. Проект собран на `Wails`, `Go`, `React` и `TypeScript`.

## Возможности

- управление локальными volt-хранилищами
- редактирование markdown-заметок
- поиск по именам файлов и содержимому
- граф заметок по wiki-ссылкам `[[...]]`

## Быстрый старт

Требования:

- Go `1.23+`
- Node.js `20+`
- Wails CLI `v2`

Установка Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0
```

Запуск в режиме разработки:

```bash
wails dev
```

Сборка:

```bash
wails build
```

## Документация

- [Обзор документации](docs/README.md)
- [Архитектура](docs/architecture.md)
- [Бэкенд](docs/backend.md)
- [Фронтенд](docs/frontend.md)
- [Релизы и GitHub Actions](docs/release.md)
