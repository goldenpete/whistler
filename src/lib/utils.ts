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
