import { useCallback, useRef } from 'react';

/**
 * Wraps a ref callback in a stable function reference that persists across renders.
 * 
 * In React 19, callback refs are detached/reattached when their identity changes
 * between renders. If the callback ref triggers setState (as dnd-kit's setNodeRef does),
 * this creates an infinite update loop:
 *   new ref → detach(null) → attach(node) → setState → re-render → new ref → ∞
 * 
 * This hook wraps the ref setter in a stable useCallback so its identity never changes,
 * preventing the detach/reattach cycle.
 */
export function useStableRef<T = HTMLElement | null>(
    setter: ((node: T) => void) | null | undefined
) {
    const setterRef = useRef(setter);
    setterRef.current = setter;
    return useCallback((node: T) => {
        setterRef.current?.(node);
    }, []);
}
