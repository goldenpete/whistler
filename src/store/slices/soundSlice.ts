/**
 * ============================================================================
 * SOUND SLICE
 * ============================================================================
 *
 * Manages sound effects (SFX) settings: which sounds are enabled,
 * custom sound configurations, and global SFX toggles.
 * ============================================================================
 */

import type { StoreSet, StoreGet, SoundKey, SoundConfig } from '../types';

export const createSoundSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── State ────────────────────────────────────────────────────────────── */

  /** Master toggle for all sound effects */
  sfxEnabled: true,

  /** Per-sound-type enable/disable toggles */
  enabledSounds: {
    cursor: true,
    confirm: true,
    error: true,
    back: true,
    search: true,
  },

  /** When true, the "search" sound plays the "confirm" sound instead */
  replaceSearchWithConfirm: false,
  /** When true, all sounds use the "cursor" sound */
  replaceAllSoundsWithCursor: false,

  /** Per-sound configuration (preset name or custom audio URL) */
  soundConfigs: {
    cursor: { source: 'preset' as const, value: 'cursor' },
    confirm: { source: 'preset' as const, value: 'confirm' },
    error: { source: 'preset' as const, value: 'error' },
    back: { source: 'preset' as const, value: 'back' },
    search: { source: 'preset' as const, value: 'search' },
  } as Record<SoundKey, SoundConfig>,

  /* ── Actions ──────────────────────────────────────────────────────────── */

  setSfxEnabled: (enabled: boolean) => set({ sfxEnabled: enabled }),

  setReplaceSearchWithConfirm: (enabled: boolean) => set({ replaceSearchWithConfirm: enabled }),
  setReplaceAllSoundsWithCursor: (enabled: boolean) => set({ replaceAllSoundsWithCursor: enabled }),

  /** Update the configuration for a specific sound type */
  setSoundConfig: (key: SoundKey, config: SoundConfig) =>
    set((state) => ({
      soundConfigs: { ...state.soundConfigs, [key]: config },
    })),

  /** Toggle a specific sound type on/off */
  toggleSound: (type: SoundKey) =>
    set((state) => {
      const currentSounds = state.enabledSounds || {
        cursor: true, confirm: true, error: true, back: true, search: true,
      };
      return {
        enabledSounds: { ...currentSounds, [type]: !currentSounds[type] },
      };
    }),
});
