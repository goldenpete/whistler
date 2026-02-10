import { useStore } from "@/store/useStore";

type SoundType = 'cursor' | 'confirm' | 'error' | 'back' | 'search';

const SOUNDS: Record<SoundType, string> = {
    cursor: '/sounds/cursor.wav',
    confirm: '/sounds/confirm.wav',
    error: '/sounds/error.wav',
    back: '/sounds/back.wav',
    search: '/sounds/search.wav',
};

const audioCache: Record<string, HTMLAudioElement> = {};

export const preloadSounds = () => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audioCache[key] = audio;
    });
};

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

    // Play
    const audio = audioCache[audioSrc] || new Audio(audioSrc);
    // Cache it if it's a preset or new custom sound
    if (!audioCache[audioSrc]) {
        audioCache[audioSrc] = audio;
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
