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
