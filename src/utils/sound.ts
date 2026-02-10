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
    const { sfxEnabled, enabledSounds, replaceSearchWithConfirm } = useStore.getState();
    if (!sfxEnabled) return;
    
    // Check if we should replace search sound with confirm
    let finalType = type;
    if (type === 'search' && replaceSearchWithConfirm) {
        finalType = 'confirm';
    }

    if (enabledSounds && !enabledSounds[finalType]) return;

    const audio = audioCache[finalType] || new Audio(SOUNDS[finalType]);
    
    // Reset if already playing or ended
    if (audio.currentTime > 0) {
        audio.currentTime = 0;
    }
    
    audio.play().catch(e => {
        // Ignore play errors (often due to user interaction policy)
        console.warn('Failed to play SFX:', e);
    });
};
