/**
 * 多主题支持
 */

/** 主题 CSS 变量定义 */
export interface ThemeVars {
  '--iv-bg': string;
  '--iv-bg-secondary': string;
  '--iv-text': string;
  '--iv-text-muted': string;
  '--iv-accent': string;
  '--iv-accent-hover': string;
  '--iv-border': string;
  '--iv-shadow': string;
  '--iv-toolbar-bg': string;
}

/** 暗色主题（默认） */
const dark: ThemeVars = {
  '--iv-bg': '#1a1a2e',
  '--iv-bg-secondary': '#16213e',
  '--iv-text': '#e8e8e8',
  '--iv-text-muted': '#a0a0b0',
  '--iv-accent': '#6c63ff',
  '--iv-accent-hover': '#7f78ff',
  '--iv-border': 'rgba(255, 255, 255, 0.1)',
  '--iv-shadow': '0 4px 24px rgba(0, 0, 0, 0.4)',
  '--iv-toolbar-bg': 'rgba(22, 33, 62, 0.95)',
};

/** 亮色主题 */
const light: ThemeVars = {
  '--iv-bg': '#f5f5f7',
  '--iv-bg-secondary': '#ffffff',
  '--iv-text': '#1d1d1f',
  '--iv-text-muted': '#6e6e73',
  '--iv-accent': '#5856d6',
  '--iv-accent-hover': '#4a48c4',
  '--iv-border': 'rgba(0, 0, 0, 0.1)',
  '--iv-shadow': '0 4px 24px rgba(0, 0, 0, 0.08)',
  '--iv-toolbar-bg': 'rgba(255, 255, 255, 0.95)',
};

/** 预设主题 */
export const THEMES: Record<string, ThemeVars> = {
  dark,
  light,
};

/** 主题名 */
export type ThemeName = 'dark' | 'light' | 'auto';

/**
 * 获取主题变量
 * auto 模式根据系统偏好返回
 */
export function getThemeVars(theme: ThemeName): ThemeVars {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? dark : light;
  }
  return THEMES[theme] || dark;
}

/** 注册自定义主题 */
export function registerTheme(name: string, vars: ThemeVars): void {
  THEMES[name] = vars;
}
