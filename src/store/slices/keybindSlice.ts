/**
 * ============================================================================
 * KEYBIND SLICE
 * ============================================================================
 *
 * Manages custom keybind overrides and disabled keybinds.
 * Users can remap any action to a different key combo or disable it entirely.
 *
 * State:
 *  - customKeybinds: Record mapping actionId → custom key string
 *  - disabledKeybinds: Array of actionIds that are turned off
 *
 * Actions:
 *  - setKeybind: Assign a new key to an action
 *  - toggleKeybind: Enable/disable an action's keybind
 *  - resetKeybinds: Clear all customizations back to defaults
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';

export const createKeybindSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── State ────────────────────────────────────────────────────────────── */
  customKeybinds: {} as Record<string, string>,
  disabledKeybinds: [] as string[],

  /* ── Actions ──────────────────────────────────────────────────────────── */

  /** Override the key binding for a specific action */
  setKeybind: (actionId: string, key: string) =>
    set((state) => ({
      customKeybinds: { ...state.customKeybinds, [actionId]: key },
    })),

  /** Enable or disable a keybind without removing the custom mapping */
  toggleKeybind: (actionId: string, enabled: boolean) =>
    set((state) => {
      const disabled = new Set(state.disabledKeybinds);
      if (enabled) {
        disabled.delete(actionId);
      } else {
        disabled.add(actionId);
      }
      return { disabledKeybinds: Array.from(disabled) };
    }),

  /** Reset all keybinds to default (clear custom mappings and re-enable all) */
  resetKeybinds: () => set({ customKeybinds: {}, disabledKeybinds: [] }),
});
