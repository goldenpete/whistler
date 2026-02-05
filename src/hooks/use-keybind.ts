import { useEffect } from 'react';

type KeybindAction = (e: KeyboardEvent) => void;

interface KeybindOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disableInInput?: boolean;
}

export function useKeybind(
  key: string,
  action: KeybindAction,
  options: KeybindOptions = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (options.disableInInput) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Parse key string (e.g., "Ctrl+S", "Shift+ArrowUp")
      const keys = key.split('+').map((k) => k.trim().toLowerCase());
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
  }, [key, action, options]);
}
