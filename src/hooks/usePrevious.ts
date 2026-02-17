/**
 * ─── usePrevious.ts ────────────────────────────────────────────────
 *
 * React hook that returns the previous value of a given variable,
 * useful for comparing current and prior state or prop values
 * across renders.
 *
 * Exports:
 *   - usePrevious<T>(value: T) → T | undefined
 * ───────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
