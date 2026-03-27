# Релизы и GitHub Actions

## Workflow

Автоматическая публикация релизов описана в [`.github/workflows/release.yml`](../.github/workflows/release.yml).

Workflow запускается при пуше любого git-тега и делает следующее:

1. собирает приложение на `Linux`, `Windows` и `macOS`
2. архивирует результат под каждую платформу
3. создает GitHub Release по имени тега, если его еще нет
4. загружает собранные файлы в релиз

## Что собирается

- `volt-linux-amd64.tar.gz`
- `volt-windows-amd64.zip`
- `volt-macos-universal.zip`

## Как выпустить релиз

Пример:

```bash
git tag v0.1.0
git push origin v0.1.0
```

После пуша тега GitHub Actions создаст релиз и прикрепит артефакты.

## Ограничения

- macOS-сборка в workflow не подписывается и не нотариализуется
- Windows-сборка не подписывается сертификатом
- Linux-сборка использует `webkit2gtk-4.1` и тег `webkit2_41` для совместимости с Ubuntu 24.04
