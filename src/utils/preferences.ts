import { ThemeMode, TextCasingMode, SystemPreferences, ThemePreset } from '../types';
import { safeLocalStorage } from './safeStorage';

const PREFERENCES_KEY = 'fm_system_preferences';
const PRESETS_KEY = 'fm_theme_presets';

export const DEFAULT_PREFERENCES: SystemPreferences = {
  theme: 'dark',
  textCasing: 'none',
};

export function getSystemPreferences(): SystemPreferences {
  try {
    const saved = safeLocalStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load system preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

export function saveSystemPreferences(prefs: SystemPreferences): void {
  try {
    safeLocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    applyThemeToDocument(prefs.theme);
  } catch (e) {
    console.error('Failed to save system preferences:', e);
  }
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light-theme', 'dark', 'midnight');
  if (theme === 'light') {
    root.classList.add('light-theme');
  } else if (theme === 'midnight') {
    root.classList.add('midnight');
  } else {
    root.classList.add('dark');
  }
}

// Theme Presets
export function getThemePresets(): ThemePreset[] {
  try {
    const saved = safeLocalStorage.getItem(PRESETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load theme presets:', e);
  }
  return [];
}

export function saveThemePreset(name: string, prefs: SystemPreferences): ThemePreset[] {
  const presets = getThemePresets();
  const existing = presets.findIndex((p) => p.name === name);
  const preset: ThemePreset = { name, preferences: { ...prefs }, savedAt: new Date().toISOString() };
  if (existing >= 0) {
    presets[existing] = preset;
  } else {
    presets.push(preset);
  }
  safeLocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

export function deleteThemePreset(name: string): ThemePreset[] {
  const presets = getThemePresets().filter((p) => p.name !== name);
  safeLocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

// Prepositions and conjunctions in Portuguese that stay lowercase in title case
const PT_LOWERCASE_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pela', 'pelo', 'pelas', 'pelos',
  'com', 'sem', 'sob', 'sobre',
  'e', 'ou', 'a', 'o', 'as', 'os',
  'para', 'ate'
]);

/**
 * Formats text based on the user's text casing preference:
 * 1. 'uppercase': ALL UPPERCASE (Ex: BOM DE PREÇO)
 * 2. 'titlecase': First letter uppercase, prepositions lowercase (Ex: Bom de Preço)
 * 3. 'none': Free text input (as typed)
 */
export function formatTextWithCasing(text: string, casing: TextCasingMode): string {
  if (!text) return text;
  if (casing === 'none') return text;

  if (casing === 'uppercase') {
    return text.toUpperCase();
  }

  if (casing === 'titlecase') {
    // Split preserving spaces and punctuation
    const words = text.split(/(\s+)/);
    let nonSpaceIndex = 0;

    return words
      .map((word) => {
        // Preserve whitespace
        if (/^\s+$/.test(word)) return word;

        const lower = word.toLowerCase();
        const isFirstWord = nonSpaceIndex === 0;
        nonSpaceIndex++;

        if (!isFirstWord && PT_LOWERCASE_WORDS.has(lower)) {
          return lower;
        }

        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
  }

  return text;
}
