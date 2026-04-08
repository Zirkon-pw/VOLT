# Мобильное приложение (React Native + PWA)

> **Статус:** Future exploration. Код мобильного приложения отсутствует в репозитории.
> Примеры кода ниже — это проектные наброски, не реализация.
> Текущая стратегия: PWA-first через web-версию. React Native — только при наличии конкретной потребности, которую PWA не покрывает.

## Обзор

Мобильное приложение Volt - это часть ядра, обеспечивающая:
- Просмотр и редактирование markdown файлов
- Работу с vault'ами (хранилищами)
- Базовую файловую систему
- Систему плагинов
- Поддержку PWA для офлайн доступа

### Чего НЕТ в ядре мобильного приложения

- ❌ Синхронизация с Git - это плагин (`volt-plugin-sync`)
- ❌ Совместное редактирование - это плагин (`volt-plugin-collab`)
- ❌ Нативные фичи (камера, уведомления) - это плагины
- ❌ Облачные сервисы - это плагины

## Архитектура React Native

### Структура проекта

```
mobile/
├── ios/                    # Нативный iOS проект
├── android/                # Нативный Android проект
├── src/                    # RN-специфичные компоненты
│   ├── navigation/         # React Navigation
│   │   └── AppNavigator.tsx
│   ├── screens/            # Экраны
│   │   ├── HomeScreen.tsx
│   │   ├── WorkspaceScreen.tsx
│   │   └── EditorScreen.tsx
│   ├── components/         # RN компоненты
│   │   ├── MobileFileTree.tsx
│   │   ├── MobileEditor.tsx
│   │   └── MobileToolbar.tsx
│   └── services/           # RN сервисы
│       └── PluginLoader.ts
├── shared/                 # Ссылка на ../frontend/src
├── common/                 # Ссылка на ../common
├── App.tsx                 # Главный компонент
├── app.json                # Конфигурация
├── package.json            # Зависимости
├── metro.config.js         # Metro bundler
├── tsconfig.json           # TypeScript
└── scripts/                # Скрипты для сборки
```

### Переиспользование кода

```typescript
// mobile/App.tsx

import { AdapterProvider } from '../shared/api/adapter-provider';
import { reactNativeAdapter } from '../shared/api/adapters/react-native';
import { AppContent } from '../shared/app/App';

export default function App() {
  return (
    <AdapterProvider adapter={reactNativeAdapter}>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AdapterProvider>
  );
}
```

### Навигация

```typescript
// mobile/src/navigation/AppNavigator.tsx

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Vaults" component={HomePage} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Workspace" component={WorkspacePage} />
      <Stack.Screen name="Editor" component={EditorScreen} />
    </Stack.Navigator>
  );
}
```

### Файловая система

```typescript
// shared/api/adapters/react-native.ts

import * as RNFS from 'react-native-fs';

export const reactNativeFileSystem: FileSystemAdapter = {
  readFile: async (path: string): Promise<string> => {
    const rnPath = convertToRNPath(path);
    return await RNFS.readFile(rnPath, 'utf8');
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    const rnPath = convertToRNPath(path);
    const dir = rnPath.substring(0, rnPath.lastIndexOf('/'));
    if (!(await RNFS.exists(dir))) {
      await RNFS.mkdir(dir);
    }
    await RNFS.writeFile(rnPath, content, 'utf8');
  },

  createFile: async (path: string, content = ''): Promise<void> => {
    await reactNativeFileSystem.writeFile(path, content);
  },

  createDirectory: async (path: string): Promise<void> => {
    await RNFS.mkdir(convertToRNPath(path));
  },

  remove: async (path: string): Promise<void> => {
    await RNFS.unlink(convertToRNPath(path));
  },

  rename: async (oldPath: string, newPath: string): Promise<void> => {
    await RNFS.moveFile(convertToRNPath(oldPath), convertToRNPath(newPath));
  },

  listDir: async (path: string): Promise<FileEntry[]> => {
    const items = await RNFS.readDir(convertToRNPath(path));
    return items.map(item => ({
      name: item.name,
      path: convertFromRNPath(item.path),
      isDirectory: item.isDirectory(),
      size: item.size,
      modifiedAt: new Date(item.mtime),
    }));
  },

  listTree: async (rootPath: string): Promise<FileTree> => {
    return buildFileTreeRecursively(convertToRNPath(rootPath));
  },

  exists: async (path: string): Promise<boolean> => {
    return await RNFS.exists(convertToRNPath(path));
  },

  stat: async (path: string): Promise<FileStat> => {
    const stat = await RNFS.stat(convertToRNPath(path));
    return {
      path: convertFromRNPath(stat.path),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modifiedAt: new Date(stat.mtime),
      createdAt: new Date(stat.ctime),
    };
  },

  safePath: async (base: string, relative: string): Promise<string> => {
    const basePath = convertToRNPath(base);
    const fullPath = `${basePath}/${relative}`;
    const normalized = RNFS.normalize(fullPath);
    
    if (!normalized.startsWith(basePath)) {
      throw new Error('Path traversal detected');
    }
    
    return convertFromRNPath(normalized);
  },
};

// Конвертация путей
function convertToRNPath(path: string): string {
  return path.replace(/^\/vault\//, RNFS.DocumentDirectoryPath + '/');
}

function convertFromRNPath(path: string): string {
  return path.replace(RNFS.DocumentDirectoryPath, '/vault');
}
```

### Редактор на мобильном

#### Вариант 1: WebView с Tiptap

```typescript
// mobile/src/screens/EditorScreen.tsx

import { WebView } from 'react-native-webview';
import { useFileSystem } from '../../shared/api/adapter-provider';

export function EditorScreen({ route }: { route: any }) {
  const { filePath } = route.params;
  const fs = useFileSystem();
  const [content, setContent] = useState('');

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    const fileContent = await fs.readFile(filePath);
    setContent(fileContent);
  };

  const saveFile = async (newContent: string) => {
    await fs.writeFile(filePath, newContent);
  };

  // Используем WebView с Tiptap для редактирования
  const editorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="tiptap-bundle.js"></script>
      <script src="tiptap-markdown.js"></script>
    </head>
    <body>
      <div id="editor"></div>
      <script>
        const editor = initializeEditor(${JSON.stringify(content)});
        
        editor.on('update', () => {
          const markdown = editor.getMarkdown();
          window.ReactNativeWebView.postMessage(markdown);
        });
        
        window.addEventListener('message', (event) => {
          if (event.data.type === 'load') {
            editor.setContent(event.data.content);
          }
        });
      </script>
    </body>
    </html>
  `;

  const onMessage = (event: any) => {
    saveFile(event.nativeEvent.data);
  };

  return (
    <WebView
      source={{ html: editorHTML }}
      onMessage={onMessage}
      style={{ flex: 1 }}
    />
  );
}
```

#### Вариант 2: Нативный редактор

```typescript
// Использование react-native-pell-rich-editor
import { RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

export function NativeEditorScreen({ route }: { route: any }) {
  const richText = useRef<RichEditor>(null);
  const [content, setContent] = useState('');
  const fs = useFileSystem();
  const { filePath } = route.params;

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    const fileContent = await fs.readFile(filePath);
    setContent(fileContent);
  };

  const onSave = async () => {
    const html = await richText.current?.getContentHTML();
    const markdown = htmlToMarkdown(html);
    await fs.writeFile(filePath, markdown);
  };

  return (
    <View style={{ flex: 1 }}>
      <RichToolbar editor={richText} />
      <RichEditor
        ref={richText}
        initialContentHTML={markdownToHTML(content)}
        onChange={setContent}
      />
      <Button title="Save" onPress={onSave} />
    </View>
  );
}
```

## PWA (Progressive Web App)

### Service Worker

```typescript
// mobile/pwa/service-worker.ts

const CACHE_NAME = 'volt-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event: InstallEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).then(fetchResponse => {
        if (fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      });
    })
  );
});
```

### Manifest

```json
// mobile/pwa/manifest.json
{
  "name": "Volt - Knowledge Base",
  "short_name": "Volt",
  "description": "Local markdown knowledge stores",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### IndexedDB для офлайн хранения

```typescript
// mobile/pwa/storage.ts

import { openDB, IDBPDatabase } from 'idb';

let db: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB('volt-pwa', 1, {
    upgrade(db) {
      db.createObjectStore('files', { keyPath: 'path' });
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });

  return db;
}

export async function cacheFile(path: string, content: string): Promise<void> {
  const db = await getDB();
  await db.put('files', { path, content, cachedAt: Date.now() });
}

export async function getCachedFile(path: string): Promise<string | null> {
  const db = await getDB();
  const file = await db.get('files', path);
  return file?.content ?? null;
}
```

## Плагины на мобильном

### Ограничения

Не все плагины desktop будут работать на мобильном:
- ❌ Плагины, использующие процессы
- ❌ Плагины с нативными модулями Node.js
- ✅ Плагины, работающие с файлами и редактором
- ✅ UI плагины

### Manifest с поддержкой платформ

```json
{
  "apiVersion": 5,
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "platforms": ["desktop", "mobile", "web"],
  "requirements": {
    "node_modules": false,
    "native_modules": false,
    "process_execution": false
  },
  "permissions": ["read", "write", "editor"],
  "settings": { ... }
}
```

### Загрузка плагинов в RN

```typescript
// mobile/src/services/plugin-loader.ts

export async function loadMobilePlugins(): Promise<void> {
  const pluginsDir = RNFS.DocumentDirectoryPath + '/.volt/plugins';
  
  if (!(await RNFS.exists(pluginsDir))) {
    return;
  }

  const pluginDirs = await RNFS.readDir(pluginsDir);

  for (const dir of pluginDirs) {
    const manifestPath = `${dir.path}/manifest.json`;
    const mainPath = `${dir.path}/main.js`;

    if (!(await RNFS.exists(manifestPath))) continue;

    const manifest = JSON.parse(await RNFS.readFile(manifestPath));
    
    // Проверить поддержку платформы
    if (!manifest.platforms?.includes('mobile')) {
      console.log(`Plugin ${manifest.id} doesn't support mobile`);
      continue;
    }

    // Проверить требования
    if (manifest.requirements?.native_modules) {
      console.log(`Plugin ${manifest.id} requires native modules`);
      continue;
    }

    // Загрузить плагин
    const mainContent = await RNFS.readFile(mainPath);
    const blob = new Blob([mainContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    try {
      const pluginModule = await import(url);
      await pluginModule.onLoad(pluginApi);
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
    }
  }
}
```

## UI/UX для мобильных

### Адаптивный дизайн

```typescript
// shared/ui/responsive.ts

import { useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const [isMobile, setIsMobile] = useState(width < 768);
  const [isTablet, setIsTablet] = useState(width >= 768 && width < 1024);
  const [isDesktop, setIsDesktop] = useState(width >= 1024);

  useEffect(() => {
    setIsMobile(width < 768);
    setIsTablet(width >= 768 && width < 1024);
    setIsDesktop(width >= 1024);
  }, [width]);

  return { isMobile, isTablet, isDesktop, width, height };
}
```

### Мобильные компоненты

```typescript
// mobile/src/components/MobileFileTree.tsx

import { FlatList, TouchableOpacity, Text } from 'react-native';

export function MobileFileTree({ entries, onSelect }: FileTreeProps) {
  const renderItem = ({ item }: { item: FileEntry }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => onSelect(item.path)}
    >
      <FileIcon isDirectory={item.isDirectory} />
      <Text style={styles.fileName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={entries}
      renderItem={renderItem}
      keyExtractor={item => item.path}
    />
  );
}
```

## Сборка и запуск

### iOS

```bash
# Установка зависимостей
cd mobile
npm install
cd ios && pod install && cd ..

# Запуск
npm run ios

# Сборка для production
npm run ios:build
```

### Android

```bash
# Запуск
npm run android

# Сборка APK
npm run android:build
```

### PWA

```bash
# Сборка
npm run build:pwa

# Тестирование
npx serve build/
```

## План реализации

### Этап 1: Базовая инфраструктура
- [ ] Создать структуру mobile/ проекта
- [ ] Настроить React Native
- [ ] Создать React Native адаптер
- [ ] Настроить навигацию

### Этап 2: Файловая система
- [ ] Реализовать файловый адаптер
- [ ] Создать экраны для vault'ов
- [ ] Реализовать создание/открытие vault'ов

### Этап 3: Редактор
- [ ] Интегрировать Tiptap в WebView
- [ ] Или создать нативный редактор
- [ ] Реализовать сохранение файлов

### Этап 4: Плагины
- [ ] Адаптировать систему плагинов
- [ ] Создать мобильный загрузчик
- [ ] Протестировать встроенные плагины

### Этап 5: PWA
- [ ] Создать service worker
- [ ] Настроить IndexedDB кэш
- [ ] Добавить manifest.json
- [ ] Протестировать офлайн режим

### Этап 6: Полировка
- [ ] Адаптивный UI
- [ ] Жесты и анимации
- [ ] Производительность
- [ ] Тестирование

## Зависимости

```json
{
  "dependencies": {
    "react-native": "^0.72.0",
    "react-native-fs": "^2.20.0",
    "react-native-document-picker": "^9.0.0",
    "react-native-image-picker": "^7.0.0",
    "react-native-webview": "^13.6.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-pell-rich-editor": "^1.9.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "idb": "^7.1.0"
  }
}
```

## Проблемы и решения

### Проблема 1: Tiptap в WebView медленный
**Решение:** Использовать нативный редактор как fallback

### Проблема 2: Ограниченный доступ к файловой системе на iOS
**Решение:** Использовать DocumentDirectoryPath и Files app integration

### Проблема 3: Не все плагины совместимы
**Решение:** Фильтрация по manifest.platforms и requirements

### Проблема 4: Нет Git в ядре
**Решение:** Пользователь устанавливает плагин `volt-plugin-sync` для синхронизации
