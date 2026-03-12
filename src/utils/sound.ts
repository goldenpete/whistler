/**
 * ─── sound.ts ────────────────────────────────────────────────────────────────
 *
 * Sound effect (SFX) playback utility for Whistler UI interactions.
 *
 * Architecture:
 *   - 5 built-in sound types: cursor, confirm, error, back, search
 *   - Sounds are preloaded as HTMLAudioElement objects on app start
 *   - playSfx() reads from the Zustand store (not React state) so it can
 *     be called from anywhere — event handlers, utilities, even outside React
 *
 * User configuration (from soundSlice):
 *   - sfxEnabled: master on/off toggle
 *   - enabledSounds: per-sound enable/disable map
 *   - replaceAllSoundsWithCursor: maps all sounds → cursor
 *   - replaceSearchWithConfirm: maps search sound → confirm
 *   - soundConfigs: per-sound overrides (custom audio file or remap to another preset)
 *
 * Usage:
 *   import { playSfx } from '@/utils/sound';
 *   playSfx('cursor');   // play click sound
 *   playSfx('confirm');  // play confirmation sound
 *
 * Also used by App.tsx's global click handler via data-sound-* attributes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useStore } from "@/store/useStore";

/** The 5 built-in sound effect types. */
type SoundType = 'cursor' | 'confirm' | 'error' | 'back' | 'search';

/** Maps each sound type to its default audio file path. */
const SOUNDS: Record<SoundType, string> = {
    cursor: '/sounds/cursor.wav',
    confirm: '/sounds/confirm.wav',
    error: '/sounds/error.wav',
    back: '/sounds/back.wav',
    search: '/sounds/search.wav',
};

/** In-memory cache of HTMLAudioElement instances for instant playback. */
const audioCache: Map<string, HTMLAudioElement> = new Map();

/** Maximum number of cached audio elements (prevents unbounded growth from custom sounds). */
const MAX_AUDIO_CACHE_SIZE = 20;

/** Keys of the built-in preloaded sounds (these should never be evicted). */
const preloadedKeys = new Set<string>();

/** Preload all default sounds into the audio cache. Call once on app start. */
export const preloadSounds = () => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audioCache.set(key, audio);
        preloadedKeys.add(key);
    });
};

/**
 * Play a sound effect. Reads user preferences from the Zustand store.
 * Safe to call from any context (inside or outside React components).
 */
export const playSfx = (type: SoundType) => {
    const { sfxEnabled, enabledSounds, replaceSearchWithConfirm, replaceAllSoundsWithCursor, soundConfigs } = useStore.getState();
    if (!sfxEnabled) return;
    
    // Check overrides first
    let mappedKey = type;
    
    if (replaceAllSoundsWithCursor) {
        mappedKey = 'cursor';
    } else if (type === 'search' && replaceSearchWithConfirm) {
        mappedKey = 'confirm';
    }

    // Check if the resulting key is enabled
    if (enabledSounds && !enabledSounds[mappedKey]) return;

    // Resolve the actual sound to play based on config
    const config = soundConfigs?.[mappedKey];
    let audioSrc: string;

    if (config?.source === 'custom') {
        audioSrc = config.value;
    } else {
        // Default behavior or mapped to another preset
        const presetKey = (config?.value as SoundType) || mappedKey;
        audioSrc = SOUNDS[presetKey];
    }

    // Play (use cached element or create a new one)
    let audio = audioCache.get(audioSrc);
    if (!audio) {
        audio = new Audio(audioSrc);
        // Evict oldest non-preloaded entry when cache is full
        if (audioCache.size >= MAX_AUDIO_CACHE_SIZE) {
            for (const [key] of audioCache) {
                if (!preloadedKeys.has(key)) {
                    audioCache.delete(key);
                    break;
                }
            }
        }
        audioCache.set(audioSrc, audio);
    }
    
    // Reset if already playing or ended
    if (audio.currentTime > 0) {
        audio.currentTime = 0;
    }
    
    audio.play().catch(e => {
        // Ignore play errors (often due to user interaction policy)
        console.warn('Failed to play SFX:', e);
    });
};
