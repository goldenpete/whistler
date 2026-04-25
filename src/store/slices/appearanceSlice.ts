/**
 * ============================================================================
 * APPEARANCE SLICE
 * ============================================================================
 *
 * Manages all visual customization: accent/base themes, custom theme editing,
 * background images/gradients, ambient music, default entity colors,
 * window outline, and toggle theming.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { AccentTheme, BaseTheme, CustomAccentTheme, CustomBaseTheme } from '@/types';
import { DEFAULT_CUSTOM_THEMES, DEFAULT_CUSTOM_ACCENT_THEMES } from '../helpers/themeDefaults';

export const createAppearanceSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── Theme State ──────────────────────────────────────────────────────── */

  /** Active accent theme preset name or custom slot ID */
  accentTheme: 'orange' as AccentTheme,
  /** Whether using preset or custom accent themes */
  accentThemeMode: 'presets' as 'presets' | 'custom',
  /** User-customized accent theme slots */
  customAccentThemes: DEFAULT_CUSTOM_ACCENT_THEMES as Record<string, CustomAccentTheme>,

  /** Active base theme preset name or custom slot ID */
  baseTheme: 'zinc' as BaseTheme,
  /** Whether using preset or custom base themes */
  baseThemeMode: 'presets' as 'presets' | 'custom',
  /** User-customized base theme slots */
  customBaseThemes: DEFAULT_CUSTOM_THEMES as Record<string, CustomBaseTheme>,

  /** Whether per-entity default color controls are visible in settings */
  enableDefaultColorControls: false,
  /** Default colors for new entities (used when creating files, collections, etc.) */
  defaultColors: {
    file: '#f59e0b',
    collection: '#f59e0b',
    storage: '#f59e0b',
    graph: '#f59e0b',
    node: '#f59e0b',
  },

  /* ── Background State ─────────────────────────────────────────────────── */

  /** URL of custom background image (null = no image) */
  backgroundImageUrl: null as string | null,
  /** Opacity of background image (0-1) */
  backgroundImageOpacity: 0.2,
  /** Solid background color (used when no gradient) */
  backgroundColor: '#000000',
  /** CSS gradient string for background */
  backgroundGradient: null as string | null,
  /** Whether to use gradient instead of solid color */
  backgroundIsGradient: false,
  /** Opacity of the dark overlay on top of background (0-1) */
  backgroundOverlayOpacity: 0.5,

  /* ── Ambient Music State ──────────────────────────────────────────────── */

  /** URL of currently playing ambient music (null = none, excluded from persist) */
  ambientMusicUrl: null as string | null,
  /** Display name of ambient music track */
  ambientMusicName: null as string | null,
  /** MIME type of ambient music */
  ambientMusicType: null as string | null,
  /** Whether ambient music is paused */
  ambientMusicPaused: false,
  /** Ambient music volume (0-1) */
  ambientMusicVolume: 0.4,
  /** Array of source IDs currently suppressing ambient music (excluded from persist) */
  ambientMusicSuppressedBy: [] as string[],
  /** IndexedDB key for persisted ambient music blob */
  ambientMusicStorageKey: null as string | null,

  /* ── Display Settings ─────────────────────────────────────────────────── */

  /** Whether to show a thin outline around the app window */
  windowOutlineEnabled: false,
  /** Whether toggle switches use theme accent color */
  toggleThemingEnabled: true,
  /** Whether large toggle buttons use theme accent color */
  largeTogglesThemingEnabled: true,
  /** Whether hover tooltips are shown across the interface */
  tooltipsEnabled: true,
  /** Whether to hide the played-color trail behind media seekbars */
  hideSeekbarProgressTrail: false,

  /* ── Theme Actions ────────────────────────────────────────────────────── */

  setAccentTheme: (theme: AccentTheme) => set({ accentTheme: theme }),
  setAccentThemeMode: (mode: 'presets' | 'custom') => set({ accentThemeMode: mode }),

  /** Update a custom accent theme slot. Merges colors partially. */
  setCustomAccentTheme: (id: string, theme: Partial<CustomAccentTheme>) =>
    set((state) => ({
      customAccentThemes: {
        ...(state.customAccentThemes || DEFAULT_CUSTOM_ACCENT_THEMES),
        [id]: {
          ...(state.customAccentThemes?.[id] || DEFAULT_CUSTOM_ACCENT_THEMES[id]),
          ...theme,
          colors: {
            ...(state.customAccentThemes?.[id]?.colors || DEFAULT_CUSTOM_ACCENT_THEMES[id].colors),
            ...(theme.colors || {}),
          },
        },
      },
    })),

  setBaseTheme: (theme: BaseTheme) => set({ baseTheme: theme }),
  setBaseThemeMode: (mode: 'presets' | 'custom') => set({ baseThemeMode: mode }),

  /** Update a custom base theme slot. Merges colors partially. */
  setCustomBaseTheme: (id: string, theme: Partial<CustomBaseTheme>) =>
    set((state) => ({
      customBaseThemes: {
        ...(state.customBaseThemes || DEFAULT_CUSTOM_THEMES),
        [id]: {
          ...(state.customBaseThemes?.[id] || DEFAULT_CUSTOM_THEMES[id]),
          ...theme,
          colors: {
            ...(state.customBaseThemes?.[id]?.colors || DEFAULT_CUSTOM_THEMES[id].colors),
            ...(theme.colors || {}),
          },
        },
      },
    })),

  setEnableDefaultColorControls: (enabled: boolean) => set({ enableDefaultColorControls: enabled }),

  /** Set the default color for a specific entity type */
  setDefaultColor: (entity: 'file' | 'collection' | 'storage' | 'graph' | 'node', color: string) =>
    set((state) => ({
      defaultColors: { ...(state.defaultColors || {}), [entity]: color },
    })),

  /* ── Background Actions ───────────────────────────────────────────────── */

  setBackgroundImageUrl: (url: string | null) => set({ backgroundImageUrl: url }),
  setBackgroundImageOpacity: (opacity: number) =>
    set({ backgroundImageOpacity: Math.max(0, Math.min(1, opacity)) }),
  setBackgroundColor: (color: string) => set({ backgroundColor: color }),
  setBackgroundGradient: (gradient: string) => set({ backgroundGradient: gradient }),
  setBackgroundIsGradient: (isGradient: boolean) => set({ backgroundIsGradient: isGradient }),
  setBackgroundOverlayOpacity: (opacity: number) => set({ backgroundOverlayOpacity: opacity }),

  /* ── Ambient Music Actions ────────────────────────────────────────────── */

  setAmbientMusicPaused: (paused: boolean) => set({ ambientMusicPaused: paused }),

  /** Set ambient music URL + metadata. Automatically unpauses. */
  setAmbientMusicUrl: (url: string | null, name: string | null = null, type: string | null = null) =>
    set({ ambientMusicUrl: url, ambientMusicName: name, ambientMusicType: type, ambientMusicPaused: false }),

  setAmbientMusicVolume: (volume: number) =>
    set({ ambientMusicVolume: Math.max(0, Math.min(1, volume)) }),

  /** Register a source that's suppressing ambient music (e.g., video playback) */
  addAmbientMusicSuppression: (source: string) =>
    set((state) => ({
      ambientMusicSuppressedBy: state.ambientMusicSuppressedBy.includes(source)
        ? state.ambientMusicSuppressedBy
        : [...state.ambientMusicSuppressedBy, source],
    })),

  /** Remove a suppression source (ambient music resumes when all sources removed) */
  removeAmbientMusicSuppression: (source: string) =>
    set((state) => ({
      ambientMusicSuppressedBy: state.ambientMusicSuppressedBy.filter((s) => s !== source),
    })),

  setAmbientMusicStorageKey: (key: string | null) => set({ ambientMusicStorageKey: key }),

  /* ── Display Setting Actions ──────────────────────────────────────────── */

  setWindowOutlineEnabled: (enabled: boolean) => set({ windowOutlineEnabled: enabled }),
  setToggleThemingEnabled: (enabled: boolean) => set({ toggleThemingEnabled: enabled }),
  setLargeTogglesThemingEnabled: (enabled: boolean) => set({ largeTogglesThemingEnabled: enabled }),
  setTooltipsEnabled: (enabled: boolean) => set({ tooltipsEnabled: enabled }),
  setHideSeekbarProgressTrail: (enabled: boolean) => set({ hideSeekbarProgressTrail: enabled }),
});
