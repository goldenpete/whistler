/**
 * ============================================================================
 * THEME DEFAULT CONSTANTS
 * ============================================================================
 *
 * Default custom theme presets for both base themes (background/foreground colors)
 * and accent themes (primary/accent colors).
 *
 * These are used as initial values in the store and as fallbacks when
 * a custom theme slot hasn't been edited by the user yet.
 *
 * Each theme has 4 customizable slots (custom-1 through custom-4).
 * ============================================================================
 */

import type { CustomBaseTheme, CustomAccentTheme } from '@/types';

/**
 * Default base theme presets (4 slots).
 * Controls: background, foreground, muted text, card, sidebar, and border colors.
 * Each maps to a Tailwind-like color palette (zinc, stone, neutral, gray).
 */
export const DEFAULT_CUSTOM_THEMES: Record<string, CustomBaseTheme> = {
  'custom-1': {
    id: 'custom-1',
    name: 'Custom 1',
    colors: {
      '--background': '#09090b',   // zinc-950
      '--foreground': '#fafafa',   // zinc-50
      '--muted-foreground': '#a1a1aa', // zinc-400
      '--card': '#18181b',         // zinc-900
      '--sidebar': '#18181b',      // zinc-900
      '--sidebar-foreground': '#fafafa',
      '--border': 'rgba(255, 255, 255, 0.1)',
    },
  },
  'custom-2': {
    id: 'custom-2',
    name: 'Custom 2',
    colors: {
      '--background': '#0c0a09',   // stone-950
      '--foreground': '#fafaf9',   // stone-50
      '--muted-foreground': '#a8a29e', // stone-400
      '--card': '#1c1917',         // stone-900
      '--sidebar': '#1c1917',      // stone-900
      '--sidebar-foreground': '#fafaf9',
      '--border': 'rgba(255, 255, 255, 0.1)',
    },
  },
  'custom-3': {
    id: 'custom-3',
    name: 'Custom 3',
    colors: {
      '--background': '#0a0a0a',   // neutral-950
      '--foreground': '#fafafa',   // neutral-50
      '--muted-foreground': '#a3a3a3', // neutral-400
      '--card': '#171717',         // neutral-900
      '--sidebar': '#171717',      // neutral-900
      '--sidebar-foreground': '#fafafa',
      '--border': 'rgba(255, 255, 255, 0.1)',
    },
  },
  'custom-4': {
    id: 'custom-4',
    name: 'Custom 4',
    colors: {
      '--background': '#030712',   // gray-950 (cool gray)
      '--foreground': '#f9fafb',   // gray-50
      '--muted-foreground': '#9ca3af', // gray-400
      '--card': '#111827',         // gray-900
      '--sidebar': '#111827',      // gray-900
      '--sidebar-foreground': '#f9fafb',
      '--border': 'rgba(255, 255, 255, 0.1)',
    },
  },
};

/**
 * Default accent theme presets (4 slots).
 * Controls: primary color and accent color (used for buttons, highlights, active states).
 * Each maps to a Tailwind color (amber, emerald, violet, sky).
 */
export const DEFAULT_CUSTOM_ACCENT_THEMES: Record<string, CustomAccentTheme> = {
  'custom-accent-1': {
    id: 'custom-accent-1',
    name: 'Custom Accent 1',
    colors: {
      '--primary': '#f59e0b',           // amber-500
      '--primary-foreground': '#ffffff',
      '--accent': '#78350f',            // amber-900
      '--accent-foreground': '#ffffff',
    },
  },
  'custom-accent-2': {
    id: 'custom-accent-2',
    name: 'Custom Accent 2',
    colors: {
      '--primary': '#10b981',           // emerald-500
      '--primary-foreground': '#ffffff',
      '--accent': '#064e3b',            // emerald-900
      '--accent-foreground': '#ffffff',
    },
  },
  'custom-accent-3': {
    id: 'custom-accent-3',
    name: 'Custom Accent 3',
    colors: {
      '--primary': '#8b5cf6',           // violet-500
      '--primary-foreground': '#ffffff',
      '--accent': '#4c1d95',            // violet-900
      '--accent-foreground': '#ffffff',
    },
  },
  'custom-accent-4': {
    id: 'custom-accent-4',
    name: 'Custom Accent 4',
    colors: {
      '--primary': '#0ea5e9',           // sky-500
      '--primary-foreground': '#ffffff',
      '--accent': '#0c4a6e',            // sky-900
      '--accent-foreground': '#ffffff',
    },
  },
};
