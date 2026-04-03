export type ThemeMode = 'light' | 'dark';
export type ThemeSource = 'builtin' | 'custom';

export const THEME_TOKEN_KEYS = [
  '--font-family',
  '--font-display',
  '--font-mono',
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-bg-hover',
  '--color-bg-active',
  '--color-surface-raised',
  '--color-surface-elevated',
  '--color-surface-overlay',
  '--color-surface-chrome',
  '--color-surface-sunken',
  '--color-selection-bg',
  '--color-selection-border',
  '--color-focus-ring',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-text-inverse',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-text',
  '--color-border',
  '--color-border-strong',
  '--color-divider',
  '--color-icon',
  '--color-icon-hover',
  '--color-success',
  '--color-warning',
  '--color-error',
  '--color-danger-bg',
  '--color-danger',
  '--color-tint-sage',
  '--color-tint-blue',
  '--color-tint-lilac',
  '--color-tint-butter',
  '--color-tint-rose',
  '--color-shadow',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-popup',
  '--shadow-floating',
  '--overlay-backdrop',
  '--code-color-text',
  '--code-color-comment',
  '--code-color-keyword',
  '--code-color-function',
  '--code-color-string',
  '--code-color-number',
  '--code-color-class',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemeDefinition {
  id: string;
  name: string;
  source: ThemeSource;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeExportV1 {
  version: 1;
  name: string;
  baseMode: ThemeMode;
  tokens: Partial<Record<string, string>>;
}

export interface ThemeExportV2 {
  version: 2;
  name: string;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
}

export type ThemeExport = ThemeExportV1 | ThemeExportV2;

const SHARED_FONT_TOKENS = {
  '--font-family': "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-display': "'Newsreader', 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  '--font-mono': "'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
} satisfies Partial<ThemeTokens>;

const LIGHT_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#f8f1e7',
  '--color-bg-secondary': '#f1e7d8',
  '--color-bg-tertiary': '#e7dac9',
  '--color-bg-hover': 'rgba(112, 87, 57, 0.08)',
  '--color-bg-active': 'rgba(112, 87, 57, 0.14)',
  '--color-surface-raised': '#fbf7f0',
  '--color-surface-elevated': 'rgba(251, 246, 238, 0.94)',
  '--color-surface-overlay': 'rgba(248, 242, 233, 0.92)',
  '--color-surface-chrome': '#eee4d5',
  '--color-surface-sunken': '#e3d7c6',
  '--color-selection-bg': 'rgba(203, 122, 87, 0.18)',
  '--color-selection-border': 'rgba(203, 122, 87, 0.4)',
  '--color-focus-ring': 'rgba(203, 122, 87, 0.2)',
  '--color-text-primary': '#433328',
  '--color-text-secondary': '#735f4f',
  '--color-text-tertiary': '#a6907d',
  '--color-text-inverse': '#fffaf5',
  '--color-accent': '#cc7a57',
  '--color-accent-hover': '#be6947',
  '--color-accent-text': '#fffaf5',
  '--color-border': '#d8cab5',
  '--color-border-strong': '#c5b59d',
  '--color-divider': 'rgba(96, 76, 53, 0.16)',
  '--color-icon': '#a3907c',
  '--color-icon-hover': '#5d4839',
  '--color-success': '#628c69',
  '--color-warning': '#c89544',
  '--color-error': '#c5645d',
  '--color-danger-bg': 'rgba(197, 100, 93, 0.12)',
  '--color-danger': '#c5645d',
  '--color-tint-sage': '#dfe5d7',
  '--color-tint-blue': '#d9e3ea',
  '--color-tint-lilac': '#e6dded',
  '--color-tint-butter': '#efe5c8',
  '--color-tint-rose': '#ecd7d7',
  '--color-shadow': '#45311d',
  '--shadow-sm': '0 10px 24px -20px rgba(69, 49, 29, 0.36), 0 2px 4px rgba(69, 49, 29, 0.06)',
  '--shadow-md': '0 18px 42px -30px rgba(69, 49, 29, 0.38), 0 10px 18px -16px rgba(69, 49, 29, 0.12)',
  '--shadow-lg': '0 28px 60px -36px rgba(69, 49, 29, 0.44), 0 14px 28px -20px rgba(69, 49, 29, 0.16)',
  '--shadow-popup': '0 24px 48px -30px rgba(69, 49, 29, 0.42), 0 0 0 1px rgba(216, 202, 181, 0.64)',
  '--shadow-floating': '0 34px 72px -42px rgba(69, 49, 29, 0.5), 0 0 0 1px rgba(216, 202, 181, 0.52)',
  '--overlay-backdrop': 'rgba(42, 29, 18, 0.22)',
  '--code-color-text': '#3f3026',
  '--code-color-comment': '#8c7765',
  '--code-color-keyword': '#9d4b61',
  '--code-color-function': '#356f66',
  '--code-color-string': '#a56b2d',
  '--code-color-number': '#7d5bb1',
  '--code-color-class': '#476c95',
};

const DARK_THEME_TOKENS: ThemeTokens = {
  ...SHARED_FONT_TOKENS,
  '--color-bg-primary': '#1f1b19',
  '--color-bg-secondary': '#27221f',
  '--color-bg-tertiary': '#312b27',
  '--color-bg-hover': 'rgba(255, 239, 220, 0.06)',
  '--color-bg-active': 'rgba(255, 224, 194, 0.1)',
  '--color-surface-raised': '#2a2421',
  '--color-surface-elevated': 'rgba(40, 35, 31, 0.94)',
  '--color-surface-overlay': 'rgba(46, 40, 36, 0.92)',
  '--color-surface-chrome': '#2b2522',
  '--color-surface-sunken': '#1a1715',
  '--color-selection-bg': 'rgba(227, 155, 107, 0.18)',
  '--color-selection-border': 'rgba(227, 155, 107, 0.4)',
  '--color-focus-ring': 'rgba(227, 155, 107, 0.24)',
  '--color-text-primary': '#f1e4d6',
  '--color-text-secondary': '#c6b4a1',
  '--color-text-tertiary': '#8f7d6d',
  '--color-text-inverse': '#1f1b19',
  '--color-accent': '#e39b6a',
  '--color-accent-hover': '#ecac7f',
  '--color-accent-text': '#261e19',
  '--color-border': 'rgba(236, 218, 198, 0.12)',
  '--color-border-strong': 'rgba(236, 218, 198, 0.22)',
  '--color-divider': 'rgba(236, 218, 198, 0.1)',
  '--color-icon': 'rgba(241, 228, 214, 0.56)',
  '--color-icon-hover': '#f3e8dc',
  '--color-success': '#8eb292',
  '--color-warning': '#d0a15d',
  '--color-error': '#d37c73',
  '--color-danger-bg': 'rgba(211, 124, 115, 0.14)',
  '--color-danger': '#e39c92',
  '--color-tint-sage': '#3d473f',
  '--color-tint-blue': '#36424a',
  '--color-tint-lilac': '#443a48',
  '--color-tint-butter': '#494331',
  '--color-tint-rose': '#4b383a',
  '--color-shadow': '#000000',
  '--shadow-sm': '0 12px 24px -18px rgba(0, 0, 0, 0.44), 0 2px 4px rgba(0, 0, 0, 0.2)',
  '--shadow-md': '0 20px 42px -26px rgba(0, 0, 0, 0.5), 0 12px 22px -18px rgba(0, 0, 0, 0.28)',
  '--shadow-lg': '0 30px 60px -30px rgba(0, 0, 0, 0.56), 0 16px 30px -22px rgba(0, 0, 0, 0.34)',
  '--shadow-popup': '0 24px 50px -28px rgba(0, 0, 0, 0.62), 0 0 0 1px rgba(236, 218, 198, 0.08)',
  '--shadow-floating': '0 34px 80px -36px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(236, 218, 198, 0.1)',
  '--overlay-backdrop': 'rgba(0, 0, 0, 0.48)',
  '--code-color-text': '#f0e7dd',
  '--code-color-comment': '#918170',
  '--code-color-keyword': '#f29cbc',
  '--code-color-function': '#86c2a0',
  '--code-color-string': '#efc387',
  '--code-color-number': '#c7a5f7',
  '--code-color-class': '#8ab6d8',
};

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Light',
    source: 'builtin',
    baseMode: 'light',
    tokens: LIGHT_THEME_TOKENS,
  },
  {
    id: 'dark',
    name: 'Dark',
    source: 'builtin',
    baseMode: 'dark',
    tokens: DARK_THEME_TOKENS,
  },
];

const BUILTIN_THEME_MAP = BUILTIN_THEMES.reduce<Record<string, ThemeDefinition>>((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {});

const BUILTIN_THEME_BY_MODE: Record<ThemeMode, ThemeDefinition> = {
  light: BUILTIN_THEME_MAP.light,
  dark: BUILTIN_THEME_MAP.dark,
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function cloneThemeTokens(tokens: ThemeTokens): ThemeTokens {
  return THEME_TOKEN_KEYS.reduce((acc, key) => {
    acc[key] = tokens[key];
    return acc;
  }, {} as ThemeTokens);
}

export function mergeThemeTokens(
  baseMode: ThemeMode,
  tokens?: Partial<Record<ThemeTokenKey, string>> | Partial<Record<string, string>> | null,
): ThemeTokens {
  const baseTokens = BUILTIN_THEME_BY_MODE[baseMode].tokens;

  return THEME_TOKEN_KEYS.reduce((acc, key) => {
    const value = tokens?.[key];
    acc[key] = typeof value === 'string' && value.trim().length > 0 ? value.trim() : baseTokens[key];
    return acc;
  }, {} as ThemeTokens);
}

export function getBuiltinThemeByMode(mode: ThemeMode): ThemeDefinition {
  return BUILTIN_THEME_BY_MODE[mode];
}

export function getThemeById(
  themeId: string | null | undefined,
  customThemes: ThemeDefinition[],
): ThemeDefinition | undefined {
  if (!themeId) return undefined;
  return BUILTIN_THEME_MAP[themeId] ?? customThemes.find((theme) => theme.id === themeId);
}

export function applyThemeTokens(target: HTMLElement, tokens: ThemeTokens): void {
  THEME_TOKEN_KEYS.forEach((key) => {
    target.style.setProperty(key, tokens[key]);
  });
}

export function createThemeId(): string {
  return `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getNextCustomThemeName(existingNames: string[]): string {
  const baseName = 'Custom theme';
  if (!existingNames.includes(baseName)) return baseName;

  let suffix = 2;
  while (existingNames.includes(`${baseName} ${suffix}`)) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
}

export function createCustomThemeDefinition(input: {
  name: string;
  baseMode: ThemeMode;
  tokens: ThemeTokens;
}): ThemeDefinition {
  const now = new Date().toISOString();

  return {
    id: createThemeId(),
    name: input.name.trim() || 'Custom theme',
    source: 'custom',
    baseMode: input.baseMode,
    tokens: cloneThemeTokens(input.tokens),
    createdAt: now,
    updatedAt: now,
  };
}

export function sanitizeStoredCustomTheme(value: unknown): ThemeDefinition | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<ThemeDefinition> & {
    tokens?: Partial<Record<string, string>>;
  };

  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return null;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return null;
  if (!isThemeMode(candidate.baseMode)) return null;

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    source: 'custom',
    baseMode: candidate.baseMode,
    tokens: mergeThemeTokens(candidate.baseMode, candidate.tokens),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  };
}

export function toThemeExport(theme: ThemeDefinition): ThemeExportV2 {
  return {
    version: 2,
    name: theme.name,
    baseMode: theme.baseMode,
    tokens: cloneThemeTokens(theme.tokens),
  };
}

export function normalizeThemeImport(value: unknown): ThemeExportV2 {
  if (!value || typeof value !== 'object') {
    throw new Error('Theme import must be a JSON object.');
  }

  const candidate = value as Partial<ThemeExport> & {
    tokens?: Partial<Record<string, string>>;
  };

  if (candidate.version !== 1 && candidate.version !== 2) {
    throw new Error('Unsupported theme version. Expected version 1 or 2.');
  }

  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    throw new Error('Theme name is required.');
  }

  if (!isThemeMode(candidate.baseMode)) {
    throw new Error('Theme baseMode must be "light" or "dark".');
  }

  return {
    version: 2,
    name: candidate.name.trim(),
    baseMode: candidate.baseMode,
    tokens: mergeThemeTokens(candidate.baseMode, candidate.tokens),
  };
}
