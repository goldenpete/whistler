/**
 * ─── utils.ts ──────────────────────────────────────────────────────
 *
 * General-purpose utility functions shared across the application.
 *
 * Exports:
 *   - cn()         – Merges Tailwind CSS class names via clsx + twMerge
 *   - clamp()      – Clamps a number between a min and max value
 *   - formatTime() – Converts seconds to "m:ss" display string
 *   - formatKey()  – Maps keyboard event key names to display symbols
 *                    (e.g. "ArrowUp" → "↑")
 * ───────────────────────────────────────────────────────────────────
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: number): string {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatKey(key: string) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'up') return '↑';
    if (k === 'arrowdown' || k === 'down') return '↓';
    if (k === 'arrowleft' || k === 'left') return '←';
    if (k === 'arrowright' || k === 'right') return '→';
    return key;
}

/** Clamp a number between a minimum and maximum value. */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
