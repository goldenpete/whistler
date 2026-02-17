/**
 * ─── use-keybind.ts ──────────────────────────────────────────────────────────
 *
 * Custom React hook for registering keyboard shortcuts.
 *
 * Features:
 *   - Resolves keybinds by action ID (looks up user overrides from the store)
 *   - Respects disabled keybinds (users can disable individual actions)
 *   - Parses key combos like "Ctrl+S", "Shift+ArrowUp"
 *   - Skips text inputs by default (configurable via `disableInInput`)
 *   - Handles modifier keys (Ctrl, Shift, Alt, Meta/Cmd)
 *
 * Usage:
 *   useKeybind('toggle-sidebar', () => toggleSidebar(), { disableInInput: true });
 *   useKeybind('Ctrl+S', () => save());  // raw key combo
 *
 * Note: Sequence keybinds (e.g. "g+h") require manual handling
 * (see GlobalKeybinds.tsx). This hook only supports single chord combos.
 *
 * Related files:
 *   - src/constants/keybinds.ts     → KEYBIND_REGISTRY (action → default key map)
 *   - src/store/slices/keybindSlice.ts → user overrides & disabled list
 *   - src/components/GlobalKeybinds.tsx → mounts all global keybinds
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { KEYBIND_REGISTRY } from '@/constants/keybinds';

type KeybindAction = (e: KeyboardEvent) => void;

interface KeybindOptions {
  /** Call e.preventDefault() when the keybind fires. */
  preventDefault?: boolean;
  /** Call e.stopPropagation() when the keybind fires. */
  stopPropagation?: boolean;
  /** When true, the keybind is ignored while focus is in a text input/textarea. */
  disableInInput?: boolean;
}

/**
 * Register a keyboard shortcut. Automatically resolves user-customized key combos.
 * @param keyOrId - Either a raw key combo ("Ctrl+K") or a registered action ID
 * @param action  - Callback to execute when the shortcut is pressed
 * @param options - Optional behavior flags
 */
export function useKeybind(
  keyOrId: string,
  action: KeybindAction,
  options: KeybindOptions = {}
) {
  const customKeybinds = useStore((state) => state.customKeybinds);
  const disabledKeybinds = useStore((state) => state.disabledKeybinds);

  // Resolve the actual key combination to listen for
  let activeKey = keyOrId;
  let isDisabled = false;

  // Check if the passed string is a registered ID
  if (KEYBIND_REGISTRY[keyOrId]) {
      const id = keyOrId;
      if (disabledKeybinds.includes(id)) {
          isDisabled = true;
      } else {
          // If custom key exists, use it. Otherwise use default.
          activeKey = customKeybinds[id] || KEYBIND_REGISTRY[id].defaultKey;
      }
  }

  useEffect(() => {
    if (isDisabled) return;
    if (!activeKey) return;
    
    // If it's a sequence (e.g. "g+h" or "shift shift"), useKeybind doesn't handle it natively yet.
    // Logic that relies on sequences typically handles it manually (like GlobalKeybinds.tsx).
    // However, if the user customized a sequence to be a single chord (e.g. "ctrl+h"),
    // this hook WILL work for that single chord.
    // If the default is a sequence, and it hasn't been customized, simple useKeybind might fail 
    // to detect it properly if it expects a single chord.
    // But for now, we assume simple chords for this hook.

    const handleKeyDown = (e: KeyboardEvent) => {
      if (options.disableInInput) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT';
        const isTextArea = target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;
        
        // Allow some inputs like ranges (sliders), checkboxes, radios, buttons
        if (isInput) {
            const inputType = (target as HTMLInputElement).type;
            const allowedTypes = ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file'];
            if (allowedTypes.includes(inputType)) {
                // Do not block
            } else {
                return;
            }
        } else if (isTextArea || isContentEditable) {
            return;
        }
      }

      // Parse key string (e.g., "Ctrl+S", "Shift+ArrowUp")
      const keys = activeKey.split('+').map((k) => k.trim().toLowerCase());
      
      // Safety check: if the key combination involves non-modifier keys in the prefix (like "g+s"),
      // this simple hook cannot handle it. It requires a sequence handler.
      // We should bail out to prevent it from triggering on just "s".
      const validModifiers = ['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd'];
      const prefixKeys = keys.slice(0, -1);
      if (prefixKeys.some(k => !validModifiers.includes(k))) {
          return;
      }

      let mainKey = keys[keys.length - 1];
      if (mainKey === 'space') mainKey = ' ';
      
      const modifiers = {
        ctrl: keys.includes('ctrl') || keys.includes('control'),
        shift: keys.includes('shift'),
        alt: keys.includes('alt'),
        meta: keys.includes('meta') || keys.includes('cmd'),
      };

      const eventKey = e.key.toLowerCase();
      
      if (
        eventKey === mainKey &&
        e.ctrlKey === modifiers.ctrl &&
        e.shiftKey === modifiers.shift &&
        e.altKey === modifiers.alt &&
        e.metaKey === modifiers.meta
      ) {
        if (options.preventDefault) e.preventDefault();
        if (options.stopPropagation) e.stopPropagation();
        action(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKey, action, options, isDisabled]);
}
